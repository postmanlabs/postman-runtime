const { errors, errorCodes } = require('./constants');
const BaseError = require('./base'),
    INVALID_LOOKUP_STRATEGY_ERROR = 'runtime~extractRunnableItems: Invalid entrypoint lookupStrategy';

/** Class representing the error of invalid lookup strategy */
class InvalidLookupStrategyError extends BaseError {
    /**
     * Creates an error object and initializes with the given message and the appropriate code
     */
    constructor () {
        super(INVALID_LOOKUP_STRATEGY_ERROR);
        this.name = errors.invalidLookupStrategy;
        this.code = errorCodes.invalidLookupStrategy;
    }
}

module.exports = InvalidLookupStrategyError;
