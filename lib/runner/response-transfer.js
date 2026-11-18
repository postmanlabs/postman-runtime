var _ = require('lodash');

module.exports = {
    /**
     * Whether the response stream stays a Buffer so the sandbox can take it over instead of a base64 copy.
     * A sandbox that cannot transfer would serialise the Buffer far slower than base64, so it needs both.
     *
     * @param {Object} runner - The run, as `this` of an extension
     * @returns {Boolean}
     */
    shouldKeepStream (runner) {
        return Boolean(_.get(runner, 'options.script.transferResponseBody') &&
            _.get(runner, 'host.supportsTransferResponseBody'));
    },

    /**
     * Gives the script its copy of a Buffer body, unless it is the item's last script, which may take the body itself.
     * A transferred body is gone from the host, so no later script could read it.
     *
     * @param {Object} context - Script context, its `response` is replaced when copied
     * @param {Array} events - Events of the item for this trigger
     * @param {Object} event - The event whose script is about to run
     * @param {Boolean} isNestedRequest - A nested run's response goes back to the calling script, so it is copied
     * @returns {Boolean} Whether the body is handed over to the sandbox
     */
    prepare (context, events, event, isNestedRequest) {
        const stream = _.get(context, 'response.stream');

        if (!Buffer.isBuffer(stream)) { return false; }

        if (isNestedRequest || event !== _.findLast(events, function (e) { return e.script && !e.script.isEmpty(); })) {
            context.response = _.assign({}, context.response, { stream: Buffer.from(stream) });
        }

        return true;
    }
};
