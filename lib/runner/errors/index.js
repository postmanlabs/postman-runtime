const _ = require('lodash');
const { errors } = require('./constants');
const InvalidLookupStrategyError = require('./invalid-lookup-strategy');
const InvalidEntryPointsError = require('./invalid-entry-points');
const InvalidFolderOrRequestError = require('./invalid-folder-or-request'),
    errorClasses = {
        invalidLookupStrategy: InvalidLookupStrategyError,
        invalidEntryPoints: InvalidEntryPointsError,
        invalidFolderOrRequest: InvalidFolderOrRequestError
    };

/**
 * Function to create error objects of different types based on the error identifier passed in.
 *
 * @param {Object} errorParams - The error identifier and the variables need to build the error object
 * @param {error} errorParams.error - The error identifier
 * @param {Object} errorParams.variables - The variables needed to build the error object
 *
 * @returns {Object} The error object built for the given parameters
 */
function createError ({ error, variables }) {
    let err;

    const errorClass = _.get(errorClasses, error);

    err = new errorClass(variables);

    return err;
}

module.exports = {
    errors,
    createError
};
