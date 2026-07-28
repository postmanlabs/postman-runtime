var _ = require('lodash'),
    Cursor = require('../cursor'),
    {
        getIterationData,
        prepareVariablesScope,
        processExecutionResult,
        prepareVaultVariableScope
    } = require('../util');

/**
 * Advance a streaming iteration-data source until the row for `iterationIndex` has
 * been pulled, stashing it on `state._dataRow` for the synchronous per-item read.
 *
 * `waterfall` runs once per item, so this is called repeatedly with the same
 * index — the `_dataNextIndex` guard makes it advance at most once per iteration,
 * which also lets it catch up when SNR skips iterations. Always returns a promise.
 *
 * Running past the declared `_dataLength` keeps the last row, mirroring the array
 * path's `data[length - 1]`. Ending *before* it means a dead cursor or a truncated
 * result, so that is reported rather than silently repeating the last row.
 *
 * @private
 * @param {Object} state - run state holding the streaming cursor fields
 * @param {Number} iterationIndex - the iteration whose row is needed
 * @returns {Promise} resolves once `state._dataRow` holds the row for this iteration
 */
function pullIterationRow (state, iterationIndex) {
    if (state._dataDone || state._dataNextIndex > iterationIndex) {
        return Promise.resolve();
    }

    return state._dataIterator.next().then(function (step) {
        if (step.done) {
            if (_.isInteger(state._dataLength) && state._dataNextIndex < state._dataLength) {
                throw new Error('runner: iteration data source ended after ' + state._dataNextIndex +
                    ' of ' + state._dataLength + ' rows');
            }

            state._dataDone = true;
        }
        else {
            state._dataRow = step.value;
            state._dataNextIndex += 1;
        }

        return pullIterationRow(state, iterationIndex);
    });
}

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
            // Defence in depth: `Runner#run` rejects this up front, but a directly
            // constructed Run would reach parallel.command, which cannot read a lazy
            // source and never releases it.
            if (this.areIterationsParallelized) {
                return done(new Error('streaming iteration data is not supported with parallel iterations'));
            }

            // Streaming iteration-data state, driven by the waterfall processor
            // and released in run.js `_closeIterationData`:
            //   _dataIterator  - the source's async iterator, pulled one row/iteration
            //   _dataRow       - the current row, read synchronously per item
            //   _dataNextIndex - rows pulled so far (guards the per-item advance)
            //   _dataDone      - stream exhausted
            //   _dataLength    - rows the source declared (see `pullIterationRow`)
            state._dataIterator = state.data[Symbol.asyncIterator]();
            state._dataRow = {};
            state._dataNextIndex = 0;
            state._dataDone = false;
            state._dataLength = state.data.length;
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

                // A nested run is handed the single row of the iteration it was invoked from, already
                // resolved against the parent's cursor in lib/runner/nested-request.js, so its own
                // iteration is the one to index by here just like any other run.
                iterationIndex = coords.iteration,
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

            // Streaming iteration data: pull this iteration's row before queueing the
            // item. `next` is the rejection handler rather than a trailing `catch` so it
            // only ever sees a pull failure — a `catch` would also cover
            // `queueIteration`, which calls `next` itself, double-calling the sealed
            // instruction callback.
            if (self.state._dataIterator) {
                return pullIterationRow(self.state, iterationIndex).then(queueIteration, next);
            }

            return queueIteration();
        }
    }
};
