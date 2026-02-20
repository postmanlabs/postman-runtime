var _ = require('lodash');

/**
 * Extract all variables with secret === true from a variable scope.
 *
 * @param {VariableScope|Object} scope - scope
 * @returns {Array} - variables
 */
function extractSecretVariables (scope) {
    if (!scope) {
        return [];
    }

    var values = _.get(scope, 'values'),
        secretVariables = [];

    if (!values || typeof values.each !== 'function') {
        return [];
    }

    values.each(function (variable) {
        if (variable && variable.secret === true) {
            secretVariables.push(variable);
        }
    });

    return secretVariables;
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
 * Scans variable scopes for secrets and invokes the secretResolver with them.
 * Consumer returns array of { resolvedValue, error, safe }; runtime applies values.
 *
 * @param {Object} payload - Request payload
 * @param {Object} payload.item - The request item
 * @param {Object} payload.environment - Environment scope
 * @param {Object} payload.globals - Globals scope
 * @param {Object} payload.collectionVariables - Collection variables scope
 * @param {Function} secretResolver - Function({ secrets, payload }, callback) that resolves secrets.
 *   Callback is (err, result) where result is Array<{ resolvedValue?: string, error?: Error, safe?: boolean }>.
 * @param {Function} callback - callback(err, secretResolutionErrors, unsafeSecretKeys)
 */
function resolveSecrets (payload, secretResolver, callback) {
    if (!secretResolver || typeof secretResolver !== 'function') {
        return callback();
    }

    var scopesToScan = [
            { name: 'environment', scope: payload.environment },
            { name: 'globals', scope: payload.globals },
            { name: 'collectionVariables', scope: payload.collectionVariables }
        ],
        secrets = [];

    scopesToScan.forEach(function (scopeInfo) {
        var secretVars = extractSecretVariables(scopeInfo.scope);

        secretVars.forEach(function (variable) {
            secrets.push({
                scopeName: scopeInfo.name,
                scope: scopeInfo.scope,
                variable: variable,
                context: buildResolverContext(payload, variable.key)
            });
        });
    });

    if (secrets.length === 0) {
        return callback();
    }

    secretResolver({ secrets, payload }, function (err, result) {
        if (err) {
            return callback(err);
        }

        if (result && Array.isArray(result)) {
            result.forEach(function (entry, i) {
                var hasResolvedValue = entry && entry.resolvedValue !== undefined &&
                    typeof entry.resolvedValue === 'string';

                if (i < secrets.length && hasResolvedValue) {
                    secrets[i].variable.set(entry.resolvedValue);
                }
            });
        }

        var secretResolutionErrors = (result && Array.isArray(result)) ?
                result.filter(function (entry) { return entry && entry.error; })
                    .map(function (entry) { return entry.error; }) :
                [],
            unsafeSecretKeys = new Set();

        if (result && Array.isArray(result)) {
            result.forEach(function (entry, i) {
                if (i < secrets.length && entry && entry.safe === false) {
                    unsafeSecretKeys.add(secrets[i].scopeName + ':' + secrets[i].variable.key);
                }
            });
        }

        callback(null, secretResolutionErrors, unsafeSecretKeys);
    });
}

module.exports = {
    resolveSecrets,
    extractSecretVariables
};
