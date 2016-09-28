var ALLOWED_REQUIRES = ['lodash', 'crypto-js', 'tv4', 'cheerio', 'backbone', 'atob', 'btoa', 'xml2js', 'buffer',
        'moment'],

    Require = function PostmanRequire (cache) {
        this._cache = cache || {};
    };

/**
 * Requires a module, and caches it in a Require
 *
 * @param moduleId
 * @returns {*}
 */
Require.prototype.require = function (moduleId) {
    if (ALLOWED_REQUIRES.indexOf(moduleId) < 0) {
        return {};  // todo: should we throw here?
    }

    if (this._cache[moduleId]) {
        return this._cache[moduleId];
    }

    // ensure that we always resolve from the current path
    var filePath = require.resolve(moduleId),
        tmp;

    tmp = require.cache[filePath];
    delete require.cache[filePath];
    this._cache[filePath] = require(filePath);

    // Restore require.cache to what it was
    if (tmp) {
        require.cache[filePath] = tmp;
    }
    else {
        delete require.cache[filePath];
    }

    return this._cache[filePath];
};

Require.prototype.dispose = function () {
    delete this._cache;
};

module.exports = Require;
