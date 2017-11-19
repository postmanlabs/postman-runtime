var _ = require('lodash'),
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
    extractNextRequestInstruction = function (executionError, executions, run, coords, callback) {
        var snr = {},
            nextCoords,
            seekingToStart,
            stopRunNow,

            stopOnFailure = run.options.stopOnFailure,
            jump;

        if (!executionError) {
            // extract set next request
            snr = extractSNR(executions.prerequest);
            snr = extractSNR(executions.test, snr);
        }

        if (!run.disableSNR && snr.defined) {
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
            jump = {
                source: coords
            };
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

        if (jump) {
            jump.destination = nextCoords;
            jump.resolved = 'item';
            jump.item = run.state.items[nextCoords.position];
        }

        // @todo - do this in unhacky way
        if (nextCoords.position === -1) {
            nextCoords.position = 0;
            seekingToStart = true;
        }

        callback(null, {
            coords: nextCoords,
            seekingToStart: seekingToStart,
            stopRunNow: stopRunNow
        }, jump);
    };

module.exports = {
    extractNextRequestInstruction: extractNextRequestInstruction
};
