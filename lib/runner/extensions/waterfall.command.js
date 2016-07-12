var _ = require('lodash'),
    Cursor = require('../cursor'),

    prepareLookupHash,
    extractSNR;

/**
 * Returns a hash of IDs and Names of items in an array
 *
 * @param {Array} items
 * @returns {Object}
 */
prepareLookupHash = function (items) {
    var hash = {
        ids: {},
        names: {},
        obj: {}
    };

    _.each(items, function (item, index) {
        if (item) {
            item.id && (hash.ids[item.id] = index);
            item.name && (hash.names[item.name] = index);
        }
    });

    return hash;
};

extractSNR = function (executions, previous) {
    var snr = previous || {};

    _.isArray(executions) && executions.forEach(function (execution) {
        _.has(_.get(execution, 'result.masked'), 'nextRequest') && (
            (snr.defined = true),
            (snr.value = execution.result.masked.nextRequest)
        );
    });

    return snr;
};

/**
 * Adds options
 * disableSNR:Boolean
 *
 * @type {Object}
 */
module.exports = {
    init: function (done) {
        var state = this.state;

        // in case the environment or global is sent as an array, assume it is the values object from our environment
        // format
        _.isArray(state.environment) &&
            (state.environment = _(state.environment).indexBy('key').mapValues('value').value());
        _.isArray(state.globals) && (state.globals = _(state.globals).indexBy('key').mapValues('value').value());

        // sanitise state object
        !_.isObject(state.environment) && (state.environment = {});
        !_.isObject(state.globals) && (state.globals = {});

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

        // queue the iteration command on start
        this.queue('waterfall', {
            coords: this.waterfall.current(),
            static: true,
            start: true
        });

        // clear the variable that is supposed to store item name and id lookup hash for easy setNextRequest
        this.snrHash = null; // we populate it in the first SNR call

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
            var coords = payload.static ? payload.coords : this.waterfall.whatnext(payload.coords),
                item = this.state.items[coords.position];

            // if there is nothing to process, we bail out from here, even before we enter the iteration cycle
            if (coords.empty) {
                return next();
            }

            // if it is a beginning of a run, we need to raise events for iteration start
            if (payload.start) {
                this.triggers.beforeIteration(null, coords);
            }

            // if this is a new iteration, we close the previous one and start new
            if (coords.cr) {
                this.triggers.iteration(null, payload.coords);
                this.triggers.beforeIteration(null, coords);
            }

            // if this is end of waterfall, it is an end of iteration and also end of run
            if (coords.eof) {
                this.triggers.iteration(null, coords);
                return next();
            }

            this.queue('item', {
                item: item,
                coords: coords,
                data: this.state.data[coords.iteration],
                environment: this.state.environment,
                globals: this.state.globals
            }, function (executionError, executions) {
                var snr = {},
                    nextCoords,
                    seekingToStart;

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
                    (snr.value !== null) && (snr.position =
                        this.snrHash[_.has(this.snrHash.ids, snr.value) ? 'ids' :
                            (_.has(this.snrHash.names, snr.value) ? 'names' : 'obj')][snr.value]);

                    snr.valid = _.isNumber(snr.position);
                }

                nextCoords = _.clone(coords);

                // if the position was detected, we set the position to the one previous to the desired location
                // this ensures that the next call to .whatnext() will return the desired position.
                snr.valid ? (nextCoords.position = snr.position - 1) :
                    // if snr was requested, but not valid, we stop this iteration.
                    // stopping an iteration is equivalent to seeking the last position of the current
                    // iteration, so that the next call to .whatnext() will automatically move to the next
                    // iteration.
                    ((snr.defined || executionError) && (nextCoords.position = nextCoords.length - 1));

                // @todo - do this in unhacky way
                if (nextCoords.position === -1) {
                    nextCoords.position = 0;
                    seekingToStart = true;
                }

                this.waterfall.seek(nextCoords.position, nextCoords.iteration, function (err, chngd, coords) {
                    // this condition should never arise, so better throw error when this happens
                    if (err) {
                        throw err;
                    }

                    this.queue('waterfall', {
                        coords: coords,
                        static: seekingToStart
                    });
                }, this);
            });

            next(null);
        }
    }
};
