const { errors, errorCodes } = require('./constants');
const BaseError = require('./base'),
    // eslint-disable-next-line no-template-curly-in-string
    INVALID_FOLDER_OR_REQUEST = 'Unable to find a folder or request: ${folderOrRequestName}';

/** Class representing the error of invalid folder or request sent in entrypoint */
class InvalidFolderOrRequestError extends BaseError {
    /**
    * Creates an error object and initializes with the given message and the appropriate code
    *
    * @param {Object} variables - Contains the variables required to build the error message
    * @param {string} variables.folderOrRequestName - The name of the folder or request
    */
    constructor ({ folderOrRequestName }) {
        // eslint-disable-next-line no-template-curly-in-string
        const errorMessage = INVALID_FOLDER_OR_REQUEST.replace('${folderOrRequestName}', folderOrRequestName);

        super(errorMessage);
        this.name = errors.invalidFolderOrRequest;
        this.code = errorCodes.invalidFolderOrRequest;
    }
}

module.exports = InvalidFolderOrRequestError;
