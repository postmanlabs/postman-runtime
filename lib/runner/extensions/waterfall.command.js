var _ = require('lodash'),
    uuid = require('node-uuid'),
    util = require('../util'),
    Cursor = require('../cursor'),

    prepareLookupHash;

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

    triggers: ['beforeIteration', 'iteration', 'beforeItem', 'item', 'beforePrerequest', 'prerequest',
        'beforeTest', 'test'],

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
                item = this.state.items[coords.position],

                // create an object structure that will be passed as context to the scripts
                ctxTemplate;

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

            ctxTemplate = {
                globals: this.state.globals,
                environment: this.state.environment,
                data: this.state.data[coords.iteration],
                iteration: coords.iteration,
                request: {
                    id: item.id,
                    name: item.name,
                    description: item.request.description ? item.request.description.toString() : undefined,
                    headers: item.request.getHeaders(),
                    method: item.request.method,
                    url: item.request.url.toString(),
                    data: (function (body) {
                        return (body && (body = body.toJSON()) && body.mode) ? body[body.mode] : undefined;
                    }(item.request && item.request.body))
                }
            };

            // store a common uuid in the coords
            coords.ref = uuid.v4();

            // here we code to queue prerequest script, then make a request and then execute test script
            this.triggers.beforeItem(null, coords, item);

            // @todo make it less nested by coding Instruction.thenQueue
            this.queue('event', {
                name: 'prerequest',
                item: item,
                context: ctxTemplate,
                trackContext: ['globals', 'environment'],
                coords: coords,
                stopOnScriptError: this.options.stopOnError
            }).done(function (results) {
                if (this.options.stopOnError && results && results[0] && results[0].error) {
                    return;
                }

                this.queue('request', {
                    item: item,
                    globals: ctxTemplate.globals,
                    environment: ctxTemplate.environment,
                    data: ctxTemplate.data,
                    coords: coords
                }).done(function (response, request) {
                    // queue the test script with the newly updated ctxTemplate
                    this.queue('event', {
                        name: 'test',
                        item: item,
                        // add the request and response to ctxTemplate for further use in test script
                        // we need to clone *deep* here because electron's IPC has a race condition where the
                        // browser process may not access the most recent reference to the object in the Node process.
                        // Deep cloning ensures that we end up sending an entirely new reference to the object.
                        context: _.assign(ctxTemplate, {
                            request: request,
                            tests: {},
                            responseBody: response.responseBody,
                            responseCode: response.responseCode,
                            responseHeaders: response.responseHeaders,
                            responseTime: response.responseTime
                        }),
                        trackContext: ['tests', 'globals', 'environment'],
                        coords: coords,
                        stopOnScriptError: this.options.stopOnError
                    }).done(function (results) {
                        var result = results && results[0] && results[0].result || {},
                            snrValid,
                            userNextRequest, // to track if user has done SNR
                            userNextRequestPosition, // flag that is set to true when a valid SNR item is found
                            nextCoords,
                            seekingToStart;

                        // trigger an event saying that item has been processed
                        this.triggers.item(null, coords, item);

                        // check whether the script internally has a setNextRequest command
                        //@todo: remove disableSNR, and instead use an API that's meant for running single Items.
                        if (_.has(result.masked, 'nextRequest') && !this.options.disableSNR) {
                            userNextRequest = result.masked.nextRequest;

                            // prepare the snr lookup hash if it is not already provided
                            !this.snrHash && (this.snrHash = prepareLookupHash(this.state.items));

                            // if it is null, we do not proceed further and move on
                            // see if a request is found in the hash and then reset the coords position to the lookup
                            // value.
                            (userNextRequest !== null) && (userNextRequestPosition =
                                this.snrHash[_.has(this.snrHash.ids, userNextRequest) ? 'ids' :
                                    (_.has(this.snrHash.names, userNextRequest) ? 'names' : 'obj')][userNextRequest]);

                            snrValid = _.isNumber(userNextRequestPosition);
                        }

                        nextCoords = _.clone(coords);

                        // if the position was detected, we set the position to the one previous to the desired location
                        // this ensures that the next call to .whatnext() will return the desired position.
                        snrValid ? (nextCoords.position = userNextRequestPosition - 1) :
                            // if snr was requested, but not valid, we stop this iteration.
                            // stopping an iteration is equivalent to seeking the last position of the current
                            // iteration, so that the next call to .whatnext() will automatically move to the next
                            // iteration.
                            (_.has(result.masked, 'nextRequest') && (nextCoords.position = nextCoords.length - 1));

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
                });
            });

            next();
        }
    }
};
