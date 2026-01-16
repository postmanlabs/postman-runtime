var _ = require('lodash'),
    async = require('async');

/**
 * Extract all variables that have a `ref` property from a variable scope.
 *
 * @param {VariableScope|Object} scope - scope
 * @returns {Array} - variables
 */
function extractRefVariables (scope) {
    if (!scope) {
        return [];
    }

    var values = _.get(scope, 'values'),
        refVariables = [];

    if (!values) {
        return [];
    }

    if (values.members && Array.isArray(values.members)) {
        values.members.forEach(function (variable) {
            if (variable && variable.ref && variable.type === 'secret') {
                refVariables.push(variable);
            }
        });
    }
    else if (Array.isArray(values)) {
        values.forEach(function (variable) {
            if (variable && variable.ref && variable.type === 'secret') {
                refVariables.push(variable);
            }
        });
    }

    return refVariables;
}

/**
 * Scans variable scopes for `ref` property and resolves them using resolver.
 *
 * @param {Object} payload - Request payload
 * @param {Function} secretResolver - Async resolver func
 * @param {Function} callback - callback
 */
function resolveSecrets (payload, secretResolver, callback) {
    if (!secretResolver || typeof secretResolver !== 'function') {
        return callback();
    }

    var scopesToScan = [
            { name: 'environment', scope: payload.environment },
            { name: 'globals', scope: payload.globals },
            { name: 'collectionVariables', scope: payload.collectionVariables },
            { name: '_variables', scope: payload._variables }
        ],
        variablesToResolve = [];

    scopesToScan.forEach(function (scopeInfo) {
        var refVars = extractRefVariables(scopeInfo.scope);

        refVars.forEach(function (variable) {
            variablesToResolve.push({
                scopeName: scopeInfo.name,
                scope: scopeInfo.scope,
                variable: variable
            });
        });
    });

    if (variablesToResolve.length === 0) {
        return callback();
    }

    async.each(variablesToResolve, function (item, next) {
        var variable = item.variable,
            ref = variable.ref,
            resolved = false,
            result;

        /**
         * Handle the resolved value and call next accordingly
         *
         * @param {Error} err - error
         * @param {*} resolvedValue - resolved secret value
         */
        function handleResolution (err, resolvedValue) {
            if (resolved) {
                return;
            }
            resolved = true;

            if (err) {
                console.warn('Secret resolution failed for variable:', variable.key, err.message);

                return next();
            }

            if (!_.isNil(resolvedValue)) {
                if (typeof variable.set === 'function') {
                    variable.set(resolvedValue);
                }
                else {
                    variable.value = resolvedValue;
                }
            }

            return next();
        }

        try {
            result = secretResolver(ref, handleResolution);

            if (result && typeof result.then === 'function') {
                result
                    .then(function (resolvedValue) {
                        handleResolution(null, resolvedValue);
                    })
                    .catch(function (err) {
                        handleResolution(err);
                    });
            }
        }
        catch (err) {
            handleResolution(err);
        }
    }, function (err) {
        callback(err);
    });
}

module.exports = {
    resolveSecrets,
    extractRefVariables
};
