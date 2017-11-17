var _ = require('lodash'),

    /**
     * Returns a hash of IDs and Names of items in an array
     *
     * @param {Array} items
     * @returns {Object}
     *
     * @private
     */
    prepareLookupHash = function (items) {
        var hash = {
            ids: {},
            names: {},
            obj: {}
        };

        _.forEach(items, function (item, index) {
            if (item) {
                item.id && (hash.ids[item.id] = index);
                item.name && (hash.names[item.name] = index);
            }
        });

        return hash;
    },

    extractSNR = function (executions, previous) {
        var snr = previous || {};

        _.isArray(executions) && executions.forEach(function (execution) {
            _.has(_.get(execution, 'result.return'), 'nextRequest') && (
                (snr.defined = true),
                (snr.value = execution.result.return.nextRequest)
            );
        });

        return snr;
    },

    getNextItem = function (err, run, currentCoords, executions, callback) { // eslint-disable-line
        var nextCoords = _.clone(currentCoords),
            snr;

        if (err) {
            // if there was an execution, we stop this iteration.
            // stopping an iteration is equivalent to seeking the last position of the current
            // iteration, so that the next call to .whatnext() will automatically move to the next
            // iteration.
            nextCoords.position = nextCoords.length - 1;
        }

        // extract set next request
        snr = extractSNR(executions.prerequest);
        snr = extractSNR(executions.test, snr);

        if (!run.options.disableSNR && snr.defined) {
            // prepare the snr lookup hash if it is not already provided
            // @todo - figure out a way to reset this post run complete
            !run.snrHash && (run.snrHash = prepareLookupHash(run.state.items));

            // if it is null, we do not proceed further and move on
            // see if a request is found in the hash and then reset the coords position to the lookup
            // value.
            (snr.value !== null) && (snr.position =
                run.snrHash[_.has(run.snrHash.ids, snr.value) ? 'ids' :
                    (_.has(run.snrHash.names, snr.value) ? 'names' : 'obj')][snr.value]);

            snr.valid = _.isNumber(snr.position);
        }

        if (snr.valid) {
            // if the position was detected,
            // we set the position to the one previous to the desired location
            // this ensures that the next call to .whatnext() will return the desired position.
            nextCoords.position = snr.position - 1;
        }
        else {
            // if snr was requested, but not valid, we stop this iteration.
            // stopping an iteration is equivalent to seeking the last position of the current
            // iteration, so that the next call to .whatnext() will automatically move to the next
            // iteration.
            (snr.defined) && (nextCoords.position = nextCoords.length - 1);
        }

        nextCoords = run.waterfall.whatnext(nextCoords);

        if (nextCoords.eof) {
            return callback(null, nextCoords);
        }

        run.waterfall.seek(nextCoords.position, nextCoords.iteration, function (err, chngd, coords) {
            // @todo: should `chngd` be handled?
            return callback(err, coords);
        }, run);
    };

module.exports = {
    getNextItem: getNextItem
};
