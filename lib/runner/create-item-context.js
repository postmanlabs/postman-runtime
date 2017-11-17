var _ = require('lodash'),
    sdk = require('postman-collection'),

    SAFE_CONTEXT_PROPERTIES = ['replayState', 'coords'];

/**
 * Creates a context object to be used with `http-request.command` extension.
 *
 * @function createItemContext
 *
 * @param {Object} payload
 * @param {Item} payload.item
 * @param {Object} [payload.coords]
 * @param {Object} [defaults]
 * @param {Object} [defaults.replayState]
 * @param {Object} [defaults.coords]
 *
 * @returns {ItemContext}
 */
module.exports = function (payload, defaults) {
    // extract properties from defaults that can/should be reused in new context
    var context = defaults ? _.pick(defaults, SAFE_CONTEXT_PROPERTIES) : {};

    // set cursor to context
    !context.coords && (context.coords = payload.coords);

    // save original item for reference
    context.originalItem = payload.item;

    // we clone item from the payload, so that we can make any changes we need there, without mutating the
    // collection
    context.item = new sdk.Item(payload.item.toJSON());

    // get a reference to the Auth instance from the item, so changes are synced back
    context.auth = context.originalItem.getAuth();

    /**
     * @typedef {Object} ItemContext
     * @property {Object} coords - current cursor
     * @property {Item} originalItem - reference to the item in the collection
     * @property {Item} item -  Holds a copy of the item given in the payload, so that it can be manipulated
     * as necessary
     * @property {RequestAuthBase|undefined} auth - If present, is the instance of Auth in the collection, which
     * is changed as necessary using intermediate requests, etc.
     * @property {ReplayState} replayState - has context on number of replays(if any) for this request
     */
    return context;
};
