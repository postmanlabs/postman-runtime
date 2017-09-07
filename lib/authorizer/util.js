var _ = require('lodash');

module.exports = {
    /**
     * Checks if interactive mode is enabled for an auth type.
     *
     * @param {Object} options
     * @param {String} authType
     *
     * @returns {Boolean}
     */
    isInteractiveForAuth: function (options, authType) {
        // if global interactive flag is a Boolean and true enable interactive mode for all auth types
        if (_.get(options, 'authorizer.interactive') === true) { return true; }

        // interactive is set in object form
        return _.get(options, ['authorizer', 'interactive', authType], false);
    }
};
