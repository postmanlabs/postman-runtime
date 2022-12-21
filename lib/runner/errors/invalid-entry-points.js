const { errors, errorCodes } = require('./constants');
const BaseError = require('./base'),
    INVALID_ENTRY_POINTS_ERROR = 'runtime~extractRunnableItems: Invalid entrypoints';

/** Class representing the error of invalid data in entrypoint */
class InvalidEntryPointsError extends BaseError {
    /**
     * Creates an error object and initializes with the given message and the appropriate code
     */
    constructor () {
        super(INVALID_ENTRY_POINTS_ERROR);
        this.name = errors.invalidEntryPoints;
        this.code = errorCodes.invalidEntryPoints;
    }
}

module.exports = InvalidEntryPointsError;
