const { errorCodes } = require('./constants');

/**
 * The base class for all the application aware errors
 */
class BaseError extends Error {
    constructor (message) {
        super(message);
        this.code = errorCodes.genericError;
    }
}

module.exports = BaseError;
