var _ = require('lodash'),
    { prepareVaultVariableScope, prepareVariablesScope,
        extractSNR, prepareLookupHash, getIterationData
    } = require('../util');

/**
 * Adds options
 * disableSNR:Boolean
 *
 * @type {Object}
 */
module.exports = {
    init: function (done) {
        if (!this.areIterationsParallelized) {
            return done();
        }
        var state = this.state;

        // ensure that the environment, globals and collectionVariables are in VariableScope instance format
        prepareVariablesScope(state);
        // prepare the vault variable scope
        prepareVaultVariableScope(state.vaultSecrets);

        // create the partition manager and partition the iterations
        this.partitionManager.createPartitions(this);
        const { partitions } = this.partitionManager;

        // queue a parallel command for each of our partitions
        partitions.forEach((partition) => {
            this.queue('parallel', {
                coords: partition.cursor.current(),
                static: true,
                start: true
            });
        });

        return done();
    },

    triggers: ['beforeIteration', 'iteration'],

    process: {
        /**
         * This processor queues partitions in parallel.
         *
         * @param {Object} payload -
         * @param {Object} payload.coords -
         * @param {Boolean} [payload.static=false] -
         * @param {Function} next -
         */
        parallel (payload, next) {
            var partitionIndex = payload.coords.partitionIndex,
                partition = this.partitionManager.partitions[partitionIndex],
                coords = payload.static ? payload.coords : partition.cursor.whatnext(payload.coords),
                item = this.state.items[coords.position],
                delay;


            if (coords.empty) {
                return next();
            }

            if (payload.stopRunNow) {
                this.triggers.iteration(null, coords);

                return next();
            }

            // if it is a beginning of a run, we need to raise events for iteration start
            if (payload.start) {
                this.triggers.beforeIteration(null, coords);
            }

            // since we will never reach coords.eof for some partitions because each cursor
            // contains cycles for the entire run, we are breaking off early here.
            // this has been done to keep the contract of a cursor intact.
            // cycles is defined as "number of iterations in the run"
            if (coords.iteration === partition.startIndex + coords.partitionCycles) {
                this.triggers.iteration(null, payload.coords);

                return next();
            }

            if (coords.cr) {
                delay = _.get(this.options, 'delay.iteration', 0);

                this.triggers.iteration(null, payload.coords);
                this.triggers.beforeIteration(null, coords);
            }


            if (coords.eof) {
                this.triggers.iteration(null, coords);

                return next();
            }

            this.queueDelay(function () {
                this.queue('item', {
                    item: item,
                    coords: coords,
                    data: getIterationData(this.state.data, coords.iteration + partition.startIndex),
                    environment: partition.variables.environment,
                    globals: partition.variables.globals,
                    vaultSecrets: this.state.vaultSecrets,
                    collectionVariables: partition.variables.collectionVariables,
                    _variables: partition.variables._variables
                }, function (executionError, executions) {
                    var snr = {},
                        nextCoords,
                        seekingToStart,
                        stopRunNow,

                        stopOnFailure = this.options.stopOnFailure;

                    if (!executionError) {
                        // extract set next request
                        snr = extractSNR(executions.prerequest);
                        snr = extractSNR(executions.test, snr);
                    }

                    if (!this.options.disableSNR && snr.defined) {
                        // prepare the snr lookup hash if it is not already provided
                        // @todo - figure out a way to reset this post run complete
                        !this.snrHash && (this.snrHash = prepareLookupHash(this.state.items));

                        // if it is null, we do not proceed further and move on
                        // see if a request is found in the hash and then reset the coords position to the lookup
                        // value.
                        (snr.value !== null) && (snr.position = // eslint-disable-next-line no-nested-ternary
                            this.snrHash[_.has(this.snrHash.ids, snr.value) ? 'ids' :
                                (_.has(this.snrHash.names, snr.value) ? 'names' : 'obj')][snr.value]);

                        snr.valid = _.isNumber(snr.position);
                    }

                    nextCoords = _.clone(coords);

                    if (snr.valid) {
                        // if the position was detected, we set the position to the one previous to the desired location
                        // this ensures that the next call to .whatnext() will return the desired position.
                        nextCoords.position = snr.position - 1;
                    }
                    else {
                        // if snr was requested, but not valid, we stop this iteration.
                        // stopping an iteration is equivalent to seeking the last position of the current
                        // iteration, so that the next call to .whatnext() will automatically move to the next
                        // iteration.
                        (snr.defined || executionError) && (nextCoords.position = nextCoords.length - 1);

                        // If we need to stop on a run, we set the stop flag to true.
                        (stopOnFailure && executionError) && (stopRunNow = true);
                    }

                    // @todo - do this in unhacky way
                    if (nextCoords.position === -1) {
                        nextCoords.position = 0;
                        seekingToStart = true;
                    }


                    partition.cursor.seek(nextCoords.position, nextCoords.iteration, function (err, chngd, coords) {
                        // this condition should never arise, so better throw error when this happens
                        if (err) {
                            throw err;
                        }

                        this.queue('parallel', {
                            coords: {
                                ...coords,
                                partitionIndex
                            },
                            static: seekingToStart,
                            stopRunNow: stopRunNow
                        });
                    }, this);
                });
            }.bind(this), {
                time: delay,
                source: 'iteration',
                cursor: coords
            }, next);
        }
    }
};
