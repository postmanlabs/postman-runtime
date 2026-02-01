var { Url, UrlMatchPatternList, VariableList } = require('postman-collection'),
    VariableScope = require('postman-collection').VariableScope,
    sdk = require('postman-collection'),
    _ = require('lodash'),

    /**
     * @const
     * @type {string}
     */
    FUNCTION = 'function',

    /**
     * @const
     * @type {string}
     */
    STRING = 'string',

    createReadStream, // function
    extractSNR, // function
    prepareLookupHash; // function

/**
 * Create readable stream for given file as well as detect possible file
 * read issues.
 *
 * @param {Object} resolver - External file resolver module
 * @param {String} fileSrc - File path
 * @param {Function} callback - Final callback
 *
 * @note This function is defined in the file's root because there is a need to
 * trap it within closure in order to append the stream clone functionalities.
 * This ensures lesser footprint in case we have a memory leak.
 */
createReadStream = function (resolver, fileSrc, callback) {
    var readStream;

    // check for the existence of the file before creating read stream.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    resolver.stat(fileSrc, function (err, stats) {
        if (err) {
            // overwrite `ENOENT: no such file or directory` error message. Most likely the case.
            err.code === 'ENOENT' && (err.message = `"${fileSrc}", no such file`);

            return callback(err);
        }

        // check for a valid file.
        if (stats && typeof stats.isFile === FUNCTION && !stats.isFile()) {
            return callback(new Error(`"${fileSrc}", is not a file`));
        }

        // check read permissions for user.
        // octal `400` signifies 'user permissions'. [4 0 0] -> [u g o]
        // `4` signifies 'read permission'. [4] -> [1 0 0] -> [r w x]
        if (stats && !(stats.mode & 0o400)) {
            return callback(new Error(`"${fileSrc}", read permission denied`));
        }

        // @note Handle all the errors before `createReadStream` to avoid listening on stream error event.
        // listening on error requires listening on end event as well. which will make this sync.
        // @note In form-data mode stream error will be handled in postman-request but bails out ongoing request.
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        readStream = resolver.createReadStream(fileSrc);

        // We might have to read the file before making the actual request
        // e.g, while calculating body hash during AWS auth or redirecting form-data params
        // So, this method wraps the `createReadStream` function with fixed arguments.
        // This makes sure that we don't have to pass `fileResolver` to
        // internal modules (like auth plugins) for security reasons.
        readStream.cloneReadStream = function (callback) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            return createReadStream(resolver, fileSrc, callback);
        };

        callback(null, readStream);
    });
};

/**
 * Extract set next request from the execution.
 *
 * @function getIterationData
 * @param {Array} executions - The prerequests or the tests of an item's execution.
 * @param {Object} previous - If extracting the tests request then prerequest's snr.
 * @return {Any} - The Set Next Request
 */
extractSNR = function (executions, previous) {
    var snr = previous || {};

    _.isArray(executions) && executions.forEach(function (execution) {
        _.has(_.get(execution, 'result.return'), 'nextRequest') && (
            (snr.defined = true),
            (snr.value = execution.result.return.nextRequest)
        );
    });

    return snr;
};


/**
 * Returns a hash of IDs and Names of items in an array
 *
 * @param {Array} items -
 * @returns {Object}
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
};

/**
 * Utility functions that are required to be re-used throughout the runner
 *
 * @module Runner~util
 * @private
 *
 * @note Do not put module logic or business logic related functions here.
 * The functions here are purely decoupled and low-level functions.
 */
module.exports = {
    /**
     * This function allows one to call another function by wrapping it within a try-catch block.
     * The first parameter is the function itself, followed by the scope in which this function is to be executed.
     * The third parameter onwards are blindly forwarded to the function being called
     *
     * @param {Function} fn -
     * @param {*} ctx -
     *
     * @returns {Error} If there was an error executing the function, the error is returned.
     * Note that if the function called here is asynchronous, it's errors will not be returned (for obvious reasons!)
     */
    safeCall (fn, ctx) {
        // extract the arguments that are to be forwarded to the function to be called
        var args = Array.prototype.slice.call(arguments, 2);

        try {
            (typeof fn === FUNCTION) && fn.apply(ctx || global, args);
        }
        catch (err) {
            return err;
        }
    },

    /**
     * Copies attributes from source object to destination object.
     *
     * @param {Object} dest -
     * @param {Object} src -
     *
     * @return {Object}
     */
    syncObject (dest, src) {
        var prop;

        // update or add values from src
        for (prop in src) {
            if (Object.hasOwn(src, prop)) {
                dest[prop] = src[prop];
            }
        }

        // remove values that no longer exist
        for (prop in dest) {
            if (Object.hasOwn(dest, prop) && !Object.hasOwn(src, prop)) {
                delete dest[prop];
            }
        }

        return dest;
    },

    /**
     * Create readable stream for given file as well as detect possible file
     * read issues. The resolver also attaches a clone function to the stream
     * so that the stream can be restarted any time.
     *
     * @param {Object} resolver - External file resolver module
     * @param {Function} resolver.stat - Resolver method to check for existence and permissions of file
     * @param {Function} resolver.createReadStream - Resolver method for creating read stream
     * @param {String} fileSrc - File path
     * @param {Function} callback -
     *
     */
    createReadStream (resolver, fileSrc, callback) {
        // bail out if resolver not found.
        if (!resolver) {
            return callback(new Error('file resolver not supported'));
        }

        // bail out if resolver is not supported.
        if (typeof resolver.stat !== FUNCTION || typeof resolver.createReadStream !== FUNCTION) {
            return callback(new Error('file resolver interface mismatch'));
        }

        // bail out if file source is invalid or empty string.
        if (!fileSrc || typeof fileSrc !== STRING) {
            return callback(new Error('invalid or missing file source'));
        }

        // now that things are sanitized and validated, we transfer it to the
        // stream reading utility function that does the heavy lifting of
        // calling there resolver to return the stream
        return createReadStream(resolver, fileSrc, callback);
    },

    /**
     * Mutates the given variable scope to be a vault variable scope by
     * converting the domains to UrlMatchPattern and adding a helper function
     * to get the matching variables for a given URL string.
     *
     * @note vault variables have a meta property called `domains` which is an
     * array of URL match pattern strings.
     *
     * @private
     * @param {PostmanVariableScope} scope - Postman variable scope instance
     */
    prepareVaultVariableScope (scope) {
        // bail out if the given scope is already a vault variable scope
        if (scope.__vaultVariableScope) {
            return scope;
        }

        // traverse all the variables and convert the domains to UrlMatchPattern
        scope.values.each((variable) => {
            const domains = variable && variable._ && variable._.domains;

            if (!(Array.isArray(domains) && domains.length)) {
                return;
            }

            // mark the scope as having domain patterns
            scope.__hasDomainPatterns = true;

            // convert the domains to UrlMatchPattern
            variable._.domainPatterns = new UrlMatchPatternList(null, domains.map((domain) => {
                const url = new Url(domain);

                // @note URL path is ignored
                return `${url.protocol || 'https'}://${url.getRemote()}:*/*`;
            }));
        });

        /**
         * Returns a list of variables that match the given URL string against
         * the domain patterns.
         *
         * @private
         * @param {String} urlString - URL string to match against
         * @returns {PostmanVariableList}
         */
        scope.__getMatchingVariables = function (urlString) {
            // return all the variables if there are no domain patterns
            if (!scope.__hasDomainPatterns) {
                return scope.values;
            }

            const variables = scope.values.filter((variable) => {
                const domainPatterns = variable && variable._ && variable._.domainPatterns;

                if (!domainPatterns) {
                    return true;
                }

                return domainPatterns.test(urlString);
            });

            return new VariableList(null, variables.map((variable) => {
                return variable.toJSON(); // clone the variable
            }));
        };

        // mark the scope as a vault variable scope
        scope.__vaultVariableScope = true;
    },

    /**
     * ensure that the environment, globals and collectionVariables are in VariableScope instance format
     * @param {*} state application state object.
     */
    prepareVariablesScope (state) {
        state.environment = VariableScope.isVariableScope(state.environment) ? state.environment :
            new VariableScope(state.environment);
        state.globals = VariableScope.isVariableScope(state.globals) ? state.globals :
            new VariableScope(state.globals);
        state.vaultSecrets = VariableScope.isVariableScope(state.vaultSecrets) ? state.vaultSecrets :
            new VariableScope(state.vaultSecrets);
        state.collectionVariables = VariableScope.isVariableScope(state.collectionVariables) ?
            state.collectionVariables : new VariableScope(state.collectionVariables);
        state._variables = VariableScope.isVariableScope(state.localVariables) ?
            state.localVariables : new VariableScope(state.localVariables);
    },

    prepareLookupHash,
    extractSNR,

    /**
     * Returns the data for the given iteration
     *
     * @function getIterationData
     * @param {Array} data - The data array containing all iterations' data
     * @param {Number} iteration - The iteration to get data for
     * @return {Any} - The data for the iteration
     */
    getIterationData (data, iteration) {
    // if iteration has a corresponding data element use that
        if (iteration < data.length) {
            return data[iteration];
        }

        // otherwise use the last data element
        return data[data.length - 1];
    },

    /**
     * Processes SNR (Set Next Request) logic and coordinate handling for both waterfall and parallel execution.
     * This function extracts the common logic for handling execution results, SNR processing, and coordinate updates.
     *
     * @param {Object} options - Configuration options
     * @param {Object} options.coords - Current coordinates
     * @param {Object} options.executions - Execution results (prerequest and test)
     * @param {Error} options.executionError - Any execution error
     * @param {Object} options.runnerOptions - Runner options (disableSNR, stopOnFailure, stopOnAssertionFailure)
     * @param {Object} options.snrHash - SNR lookup hash
     * @param {Array} options.items - Collection items for SNR hash preparation
     * @returns {Object} Processing result with nextCoords, seekingToStart, stopRunNow flags
     */
    processExecutionResult (options) {
        var { coords, executions, executionError, runnerOptions, snrHash, items } = options,
            snr = {},
            nextCoords,
            seekingToStart,
            stopRunNow,
            stopOnFailure = runnerOptions.stopOnFailure,
            stopOnAssertionFailure = runnerOptions.stopOnAssertionFailure,
            isAssertionFailure;

        if (!executionError) {
            // extract set next request
            snr = extractSNR(executions.prerequest);
            snr = extractSNR(executions.test, snr);
        }

        if (!runnerOptions.disableSNR && snr.defined) {
            // prepare the snr lookup hash if it is not already provided
            !snrHash && (snrHash = prepareLookupHash(items));

            // if it is null, we do not proceed further and move on
            // see if a request is found in the hash and then reset the coords position to the lookup
            // value.
            (snr.value !== null) && (snr.position = // eslint-disable-next-line no-nested-ternary
                snrHash[_.has(snrHash.ids, snr.value) ? 'ids' :
                    (_.has(snrHash.names, snr.value) ? 'names' : 'obj')][snr.value]);

            snr.valid = _.isNumber(snr.position);
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
            // stopOnFailure stops on any error, stopOnAssertionFailure only stops on assertion failures
            if (executionError) {
                isAssertionFailure = executionError.name === 'AssertionFailure' ||
                    (executionError.error && executionError.error.name === 'AssertionFailure');

                if (stopOnFailure) {
                    stopRunNow = true;
                }
                else if (stopOnAssertionFailure && isAssertionFailure) {
                    stopRunNow = true;
                }
            }
        }

        // @todo - do this in unhacky way
        if (nextCoords.position === -1) {
            nextCoords.position = 0;
            seekingToStart = true;
        }

        return {
            nextCoords,
            seekingToStart,
            stopRunNow,
            snrHash
        };
    },

    /**
     * Resolve variables in item and auth in context.
     *
     * @param {ItemContext} context -
     * @param {Item} [context.item] -
     * @param {RequestAuth} [context.auth] -
     * @param {Object} payload -
     * @param {VariableScope} payload._variables -
     * @param {Object} payload.data -
     * @param {VariableScope} payload.environment -
     * @param {VariableScope} payload.collectionVariables -
     * @param {VariableScope} payload.globals -
     * @param {VariableScope} payload.vaultSecrets -
     */
    resolveVariables (context, payload) {
        if (!(context.item && context.item.request)) { return; }

        // @todo - resolve variables in a more graceful way
        var variableDefinitions = [
            // extract the variable list from variable scopes
            // @note: this is the order of precedence for variable resolution - don't change it
                _.get(payload, '_variables.values', []),
                _.get(payload, 'data', []),
                _.get(payload, 'environment.values', []),
                _.get(payload, 'collectionVariables.values', []),
                _.get(payload, 'globals.values', [])
            // @note vault variables are added later
            ],
            vaultValues = _.get(payload, 'vaultSecrets.values'),

            hasVaultSecrets = vaultValues ? vaultValues.count() > 0 : false,

            itemParent = context.item.parent(),
            urlObj = context.item.request.url,
            // @note URL string is used to resolve nested variables as URL parser doesn't support them well.
            urlString = urlObj.toString(),
            unresolvedUrlString = urlString,

            vaultVariables,
            vaultUrl,
            item,
            auth;

        if (hasVaultSecrets) {
        // get the vault variables that match the unresolved URL string
            vaultUrl = urlObj.protocol ? urlString : `http://${urlString}`; // force protocol
            vaultVariables = payload.vaultSecrets.__getMatchingVariables(vaultUrl);

            // resolve variables in URL string with initial vault variables
            urlString = sdk.Property.replaceSubstitutions(urlString, [...variableDefinitions, vaultVariables]);

            if (urlString !== unresolvedUrlString) {
            // get the final list of vault variables that match the resolved URL string
                vaultUrl = new sdk.Url(urlString).toString(true);
                vaultVariables = payload.vaultSecrets.__getMatchingVariables(vaultUrl);

                // resolve vault variables in URL string
                // @note other variable scopes are skipped as they are already resolved
                urlString = sdk.Property.replaceSubstitutions(urlString, [vaultVariables]);
            }

            // add vault variables to the list of variable definitions
            variableDefinitions.push(vaultVariables);
        }
        else if (urlString) {
            urlString = sdk.Property.replaceSubstitutions(urlString, variableDefinitions);
        }

        // @todo - no need to sync variables when SDK starts supporting resolution from scope directly
        // @todo - avoid resolving the entire item as this unnecessarily resolves URL
        item = context.item = new sdk.Item(context.item.toObjectResolved(null,
            variableDefinitions, { ignoreOwnVariables: true }));

        // restore the parent reference
        item.setParent(itemParent);

        // re-parse and update the URL from the resolved string
        urlString && (item.request.url = new sdk.Url(urlString));

        auth = context.auth;

        // resolve variables in auth
        auth && (context.auth = new sdk.RequestAuth(auth.toObjectResolved(null,
            variableDefinitions, { ignoreOwnVariables: true })));
    }
};
