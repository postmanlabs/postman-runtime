var _ = require('lodash'),
    async = require('async'),
    sdk = require('postman-collection'),

    DEFAULT_TIMEOUT = 5000,
    DEFAULT_RETRY_COUNT = 0;

/**
 * Extract all variables that have a `source` property from a variable scope.
 *
 * @param {VariableScope|Object} scope - scope
 * @param {Set} [usedVariables] - optional set of variable keys to filter by
 * @returns {Array} - variables
 */
function extractSourceVariables (scope, usedVariables) {
    if (!scope) {
        return [];
    }

    var values = _.get(scope, 'values'),
        sourceVariables = [];

    if (!values) {
        return [];
    }

    if (values.members && Array.isArray(values.members)) {
        values.members.forEach(function (variable) {
            if (variable && variable.source && variable.type === 'secret') {
                if (!usedVariables || usedVariables.has(variable.key)) {
                    sourceVariables.push(variable);
                }
            }
        });
    }
    else if (Array.isArray(values)) {
        values.forEach(function (variable) {
            if (variable && variable.source && variable.type === 'secret') {
                if (!usedVariables || usedVariables.has(variable.key)) {
                    sourceVariables.push(variable);
                }
            }
        });
    }

    return sourceVariables;
}

/**
 * Find all variable substitutions used in the request item.
 * Scans URL, headers, body, auth, and other request components.
 *
 * @param {Item} item - The request item to scan
 * @returns {Set} - Set of variable keys used in the item
 */
function findUsedVariables (item) {
    var variableSet = new Set(),
        itemJson,
        substitutions;

    if (item) {
        itemJson = typeof item.toJSON === 'function' ? item.toJSON() : item;
        substitutions = sdk.Property.findSubstitutions(itemJson);
        substitutions.forEach(function (v) { variableSet.add(v); });
    }

    return variableSet;
}

/**
 * Build context object for resolver function
 *
 * @param {Object} payload - Request payload
 * @param {String} variableKey - The key of the variable being resolved
 * @returns {Object} - Context object
 */
function buildResolverContext (payload, variableKey) {
    return {
        item: payload.item,
        variableKey: variableKey
    };
}

/**
 * Create a standardized secret error object
 *
 * @param {String} code - Error code
 * @param {String} message - Human readable error message
 * @param {Object} details - Additional error details
 * @returns {Error} - Error object with additional properties
 */
function createSecretError (code, message, details) {
    var error = new Error(message);

    error.code = code;
    error.details = details;

    return error;
}

/**
 * Execute a single resolver with timeout and retry support
 *
 * @param {Function} resolver - The resolver function
 * @param {Object} secret - Secret object (source without type)
 * @param {Object} context - Resolver context
 * @param {Object} options - Execution options
 * @param {Number} options.timeout - Timeout in ms
 * @param {Number} options.retryCount - Number of retries
 * @param {Function} callback - Callback(err, resolvedValue)
 */
function executeResolver (resolver, secret, context, options, callback) {
    var timeout = options.timeout || DEFAULT_TIMEOUT,
        retriesLeft = options.retryCount || DEFAULT_RETRY_COUNT,
        timeoutId,
        completed = false;

    function attemptResolve () {
        var result;

        timeoutId = setTimeout(function () {
            if (completed) {
                return;
            }

            if (retriesLeft > 0) {
                retriesLeft--;

                return attemptResolve();
            }

            completed = true;
            callback(new Error('Secret resolution timed out after ' + timeout + 'ms'));
        }, timeout);

        try {
            result = resolver(secret, context);

            // promise-based resolver handling
            if (result && typeof result.then === 'function') {
                result
                    .then(function (resolvedValue) {
                        if (completed) {
                            return;
                        }
                        clearTimeout(timeoutId);
                        completed = true;
                        callback(null, resolvedValue);
                    })
                    .catch(function (err) {
                        if (completed) {
                            return;
                        }
                        clearTimeout(timeoutId);

                        if (retriesLeft > 0) {
                            retriesLeft--;

                            return attemptResolve();
                        }

                        completed = true;
                        callback(err);
                    });
            }
            // synchronous resolver handling
            else if (result !== undefined) {
                if (completed) {
                    return;
                }
                clearTimeout(timeoutId);
                completed = true;

                return callback(null, result);
            }
            // assume callback-based in other cases
            else {
                if (completed) {
                    return;
                }
                clearTimeout(timeoutId);
                completed = true;

                return callback(null, undefined);
            }
        }
        catch (err) {
            if (completed) {
                return;
            }
            clearTimeout(timeoutId);

            if (retriesLeft > 0) {
                retriesLeft--;

                return attemptResolve();
            }

            completed = true;

            return callback(err);
        }
    }

    attemptResolve();
}

/**
 * Scans variable scopes for secrets and resolves them using configured resolvers.
 * Resolves secrets in parallel. If any resolution fails, stops and returns the error.
 *
 * @param {Object} payload - Request payload
 * @param {Object} payload.item - The request item
 * @param {Object} payload.environment - Environment scope
 * @param {Object} payload.globals - Globals scope
 * @param {Object} payload.collectionVariables - Collection variables scope
 * @param {Object} secretResolvers - Object mapping source types to resolver configs
 * @param {Function} callback - callback(err)
 */
function resolveSecrets (payload, secretResolvers, callback) {
    if (!secretResolvers || typeof secretResolvers !== 'object' || _.isEmpty(secretResolvers)) {
        return callback();
    }

    var usedVariables = findUsedVariables(payload.item),
        scopesToScan = [
            { name: 'environment', scope: payload.environment },
            { name: 'globals', scope: payload.globals },
            { name: 'collectionVariables', scope: payload.collectionVariables }
        ],
        variablesToResolve = [];

    scopesToScan.forEach(function (scopeInfo) {
        var sourceVars = extractSourceVariables(scopeInfo.scope, usedVariables);

        sourceVars.forEach(function (variable) {
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
            source = variable.source,
            sourceType = source && source.type,
            resolverConfig = sourceType && secretResolvers[sourceType],
            secret,
            context,
            errorDetails;

        // No resolver for this source type - keep placeholder value
        if (!resolverConfig || typeof resolverConfig.resolver !== 'function') {
            return next();
        }

        secret = _.omit(source, 'type');
        context = buildResolverContext(payload, variable.key);
        errorDetails = {
            key: variable.key,
            secretType: sourceType,
            resolverId: resolverConfig.id || sourceType,
            resolverName: resolverConfig.name || sourceType
        };

        executeResolver(resolverConfig.resolver,
            secret,
            context,
            {
                timeout: resolverConfig.timeout || DEFAULT_TIMEOUT,
                retryCount: resolverConfig.retryCount || DEFAULT_RETRY_COUNT
            },
            function (err, resolvedValue) {
                if (err) {
                    var isTimeout = err.message && err.message.includes('timed out'),
                        errorCode = isTimeout ?
                            'SECRET_RESOLUTION_TIMEOUT' : 'SECRET_RESOLUTION_FAILED',
                        secretError = createSecretError(errorCode,
                            'Failed to resolve secret: ' + err.message,
                            errorDetails);

                    // Blocking error - pass to next() to stop processing and fail the request
                    return next(secretError);
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
            });
    }, function (err) {
        callback(err);
    });
}

module.exports = {
    resolveSecrets,
    extractSourceVariables,
    findUsedVariables
};
