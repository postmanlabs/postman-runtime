var _ = require('lodash'),
    Cursor = require('../cursor'),
    {
        getIterationData,
        prepareVariablesScope,
        processExecutionResult,
        prepareVaultVariableScope
    } = require('../util');

/**
 * Adds options
 * disableSNR:Boolean
 *
 * @type {Object}
 */
module.exports = {
    init: function (done) {
        var state = this.state;

        // prepare the vault variable scope and other variables
        prepareVariablesScope(state);
        prepareVaultVariableScope(state.vaultSecrets);

        // ensure that the items and iteration data set is in place
        !_.isArray(state.items) && (state.items = []);

        // a streaming iteration-data source is an async-iterable, not an array —
        // leave it intact and set up the iterator plus the row the runner reads
        // synchronously (the async pull happens in the waterfall processor).
        if (!state.data || typeof state.data[Symbol.asyncIterator] !== 'function') {
            !_.isArray(state.data) && (state.data = []);
            !_.isObject(state.data[0]) && (state.data[0] = {});
        }
        else {
            state._dataIterator = state.data[Symbol.asyncIterator]();
            state._dataRow = {};
            state._dataNextIndex = 0;
            state._dataDone = false;
        }

        // if the location in state is already normalised then go ahead and queue iteration, else normalise the
        // location
        state.cursor = Cursor.box(state.cursor, { // we pass bounds to ensure there is no stale state
            cycles: this.options.iterationCount,
            length: state.items.length
        });
        this.waterfall = state.cursor; // copy the location object to instance for quick access

        // queue the waterfall command if iterations are not parallelized
        if (!this.areIterationsParallelized) {
            this.queue('waterfall', {
                coords: this.waterfall.current(),
                static: true,
                start: true
            });
        }

        // clear the variable that is supposed to store item name and id lookup hash for easy setNextRequest
        this.snrHash = null; // we populate it in the first SNR call

        done();
    },

    triggers: ['beforeIteration', 'iteration'],

    process: {
        /**
         * This processor simply queues scripts and requests in a linear chain.
         *
         * @param {Object} payload -
         * @param {Object} payload.coords -
         * @param {Boolean} [payload.static=false] -
         * @param {Function} next -
         */
        waterfall (payload, next) {
            // we procure the coordinates that we have to pick item and data from. the data is
            var coords = payload.static ? payload.coords : this.waterfall.whatnext(payload.coords),
                item = this.state.items[coords.position],
                delay,
                isNestedRequest = this.state.nestedRequest !== undefined,
                rootRequestCursor = isNestedRequest ? this.state.nestedRequest.rootCursor : coords,
                iterationIndex = isNestedRequest ? rootRequestCursor.iteration : coords.iteration,
                self = this;

            // queues the item for this iteration; wrapped so a streaming data
            // source can be pulled (asynchronously) before the item runs
            function queueIteration () {
                self.queueDelay(function () {
                    this.queue('item', {
                        item: item,
                        coords: coords,
                        data: this.state._dataIterator ?
                            this.state._dataRow :
                            getIterationData(this.state.data, iterationIndex),
                        environment: this.state.environment,
                        globals: this.state.globals,
                        vaultSecrets: this.state.vaultSecrets,
                        collectionVariables: this.state.collectionVariables,
                        _variables: this.state._variables
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

                        this.waterfall.seek(nextCoords.position, nextCoords.iteration, function (err, chngd, coords) {
                            // this condition should never arise, so better throw error when this happens
                            if (err) {
                                throw err;
                            }

                            this.queue('waterfall', {
                                coords: coords,
                                static: seekingToStart,
                                stopRunNow: stopRunNow
                            });
                        }, this);
                    });
                }.bind(self), {
                    time: delay,
                    source: 'iteration',
                    cursor: coords
                }, next);
            }

            // if there is nothing to process, we bail out from here, even before we enter the iteration cycle
            if (coords.empty) {
                return next();
            }

            if (payload.stopRunNow) {
                this.triggers.iteration(null, payload.coords);

                return next();
            }

            // if it is a beginning of a run, we need to raise events for iteration start
            if (payload.start) {
                this.triggers.beforeIteration(null, coords);
            }

            // if this is a new iteration, we close the previous one and start new
            if (coords.cr) {
                // getting the iteration delay here ensures that delay is only called between two iterations
                delay = _.get(this.options, 'delay.iteration', 0);

                this.triggers.iteration(null, payload.coords);
                this.triggers.beforeIteration(null, coords);
            }

            // if this is end of waterfall, it is an end of iteration and also end of run
            if (coords.eof) {
                this.triggers.iteration(null, coords);

                return next();
            }

            // Streaming iteration data: pull rows up to this iteration's index,
            // stashing the current row for the synchronous read in queueIteration.
            // waterfall() runs once per item, so this is called repeatedly with
            // the same iterationIndex — the _dataNextIndex guard makes it advance
            // at most once per iteration (idempotent, forward-only). No-op for
            // arrays. Over-run past the stream keeps the last row.
            if (self.state._dataIterator) {
                return (function pump () {
                    if (self.state._dataDone || self.state._dataNextIndex > iterationIndex) {
                        return queueIteration();
                    }

                    return self.state._dataIterator.next().then(function (step) {
                        if (step.done) {
                            self.state._dataDone = true;
                        }
                        else {
                            self.state._dataRow = step.value;
                            self.state._dataNextIndex += 1;
                        }

                        return pump();
                    });
                }()).catch(next);
            }

            return queueIteration();
        }
    }
};
