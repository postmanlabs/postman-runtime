var _ = require('lodash'),
    { prepareVaultVariableScope, prepareVariablesScope,
        getIterationData, processExecutionResult
    } = require('../util');

/**
 * Adds options
 * disableSNR:Boolean
 *
 * @type {Object}
 */
module.exports = {
    init: function (done) {
        // bail out if iterations are not parallelized
        if (!this.areIterationsParallelized) {
            return done();
        }

        var state = this.state;

        // ensure that the environment, globals and collectionVariables are in VariableScope instance format
        prepareVariablesScope(state);
        // prepare the vault variable scope
        prepareVaultVariableScope(state.vaultSecrets);

        // create the partition manager and partition the iterations
        this.partitionManager.createPartitions();
        const { partitions } = this.partitionManager;

        // queue a parallel command for each of our partitions
        partitions.forEach((partition) => {
            this.queue('parallel', {
                coords: partition.cursor.current(),
                static: true,
                start: true
            });
        });

        done();
    },

    triggers: ['beforeIteration', 'iteration'],

    prototype: {
        /**
         * Starts a parallel iteration
         *
         * @param {Number} index - The index of the partition to run
         * @param {Object} localVariables - Local variables for the iteration
         * @param {Function} callback - The callback to call when the iteration is complete
         */
        startParallelIteration (index, localVariables, callback) {
            this.partitionManager.runSinglePartition(index, localVariables, callback);
        },

        /**
         * Stops a parallel iteration
         *
         * @param {Number} index - The index of the partition to stop
         * @param {Function} callback - The callback to call when the iteration is complete
         */
        stopParallelIteration (index, callback) {
            this.partitionManager.stopSinglePartition(index, callback);
        }
    },

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
                    // Use shared utility function to process execution results and handle SNR logic
                    var result = processExecutionResult({
                            coords: coords,
                            executions: executions,
                            executionError: executionError,
                            runnerOptions: this.options,
                            snrHash: this.snrHash,
                            items: this.state.items
                        }),
                        nextCoords,
                        seekingToStart,
                        stopRunNow;

                    // Update the snrHash if it was created/updated by the utility function
                    this.snrHash = result.snrHash;

                    nextCoords = result.nextCoords;
                    seekingToStart = result.seekingToStart;
                    stopRunNow = result.stopRunNow;


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
