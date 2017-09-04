var _ = require('lodash'),
    createAuthInterface;

/**
* Creates a wrapper around RequestAuth and provides getters and setters helper functions
*
* @param {RequestAuth} auth
* @return {AuthInterface}
*/
createAuthInterface = function (auth) {
    // cached value of auth object
    var authObject = {};

    /**
     * Updates the cache value for auth object which is used by #get
     */
    function updateCache() {
        authObject = auth.parameters().toObject();
    }

    updateCache();

    /**
     * @typedef AuthInterface
     */
    return {
        /**
         * @param {String|Array<String>} key
         * @return {*} Returns a value for a key or an object having all keys & values depending on the input
         * @example 
         * get('foo') // bar
         * get(['foo', 'alpha']) // {foo: 'bar', 'alpha': 'beta'}
         */
        get: function (key) {
            if (_.isString(key)) {
                return authObject[key];
            }
            if (_.isArray(key)) {
                return _.pick(authObject, key);
            }
        },

        /**
         * @param {String|Object} key
         * @param {*} [value]
         * @return {AuthInterface}
         * @example set('foo', 'bar') or set({foo: 'bar', 'alpha': 'beta'})
         */
        set: function (key, value) {
            var modifiedParams = {};

            if (_.isPlainObject(key)) {
                modifiedParams = key;
            }
            else if (_.isString(key)) {
                modifiedParams[key] = value;
            }
            else { // invalid input found, no change to auth
                return this;
            }

            _.forEach(modifiedParams, (value, key) => {
                var param;
                // if auth has the param already then update it only when it's a sytem property
                if ((param = auth.parameters().one(key))) {
                    param.system && param.set(value);
                }
                // when param is missing then just add a new param to the variableList
                // do not use append/insert since they don't typecast the item being added
                else {
                    auth.parameters().add({key: key, value: value, system: true});
                }
            });
            updateCache();

            return this;
        }
    };
};

module.exports = createAuthInterface;
