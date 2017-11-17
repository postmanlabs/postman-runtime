var _ = require('lodash'),
    Cursor = require('../cursor'),
    VariableScope = require('postman-collection').VariableScope,
    getNextItem = require('../get-next-item').getNextItem;

/**
 * Adds options
 * disableSNR:Boolean
 *
 * @type {Object}
 */
module.exports = {
    init: function (done) {
        var state = this.state;

        // ensure that the environment, globals and collectionVariables are in VariableScope instance format
        state.environment = VariableScope.isVariableScope(state.environment) ? state.environment :
            new VariableScope(state.environment);
        state.globals = VariableScope.isVariableScope(state.globals) ? state.globals :
            new VariableScope(state.globals);
        state.collectionVariables = VariableScope.isVariableScope(state.collectionVariables) ?
            state.collectionVariables : new VariableScope(state.collectionVariables);
        state._variables = new VariableScope();

        // ensure that the items and iteration data set is in place
        !_.isArray(state.items) && (state.items = []);
        !_.isArray(state.data) && (state.data = []);
        !_.isObject(state.data[0]) && (state.data[0] = {});

        // if the location in state is already normalised then go ahead and queue iteration, else normalise the
        // location
        state.cursor = Cursor.box(state.cursor, { // we pass bounds to ensure there is no stale state
            cycles: state.data.length,
            length: state.items.length
        });
        this.waterfall = state.cursor; // copy the location object to instance for quick access

        // clear the variable that is supposed to store item name and id lookup hash for easy setNextRequest
        this.snrHash = null; // we populate it in the first SNR call

        // queue the iteration command on start
        this.queue('waterfall', {
            coords: this.waterfall.current(),
            start: true
        });

        done();
    },

    triggers: ['beforeIteration', 'iteration'],

    process: {
        /**
         * This processor simply queues scripts and requests in a linear chain.
         *
         * @param {Object} payload
         * @param {Object} payload.coords
         * @param {Boolean} [payload.static=false]
         * @param {Function} next
         */
        waterfall: function (payload, next) {
            // we procure the coordinates that we have to pick item and data from. the data is
            var coords = payload.coords,
                item = this.state.items[coords.position],
                delay;

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

            // if this is end of waterfall, it is an end of iteration and also end of run
            if (coords.eof) {
                this.triggers.iteration(null, coords);
                return next();
            }

            // if this is a new iteration, we close the previous one and start new
            if (coords.cr) {
                // getting the iteration delay here ensures that delay is only called between two iterations
                delay = _.get(this.options, 'delay.iteration', 0);

                this.triggers.iteration(null, payload.coords);
                this.triggers.beforeIteration(null, coords);
            }

            this.queueDelay(function () {
                this.queue('item', {
                    item: item,
                    coords: coords,
                    data: this.state.data[coords.iteration],
                    environment: this.state.environment,
                    globals: this.state.globals,
                    collectionVariables: this.state.collectionVariables,
                    _variables: this.state._variables
                }, function (executionError, executions) {
                    var stopOnFailure = this.options.stopOnFailure;

                    return getNextItem(executionError, this, coords, executions, function (err, coords) {
                        // this condition should never arise, so better throw error when this happens
                        if (err) {
                            throw err;
                        }

                        this.queue('waterfall', {
                            coords: coords,
                            stopRunNow: (executionError && stopOnFailure)
                        });
                    }.bind(this));
                });
            }.bind(this), {
                time: delay,
                source: 'iteration',
                cursor: coords
            }, next);
        }
    }
};
