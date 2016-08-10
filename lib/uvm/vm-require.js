'use strict';
var resolveFrom = require('resolve-from'),

    _cache = {},

    ALLOWED_REQUIRES = ['lodash', 'crypto-js', 'tv4', 'cheerio',
        'backbone', 'atob', 'btoa', 'xml2js', 'buffer'];

module.exports = function (moduleId) {
    if (ALLOWED_REQUIRES.indexOf(moduleId) < 0) {
        return {};  // todo: should we throw here?
    }

    // ensure that we always resolve from the current path
    var filePath = resolveFrom('.', moduleId),
        tmp = require.cache,
        ret;
    require.cache = _cache;
    ret = require(filePath);
    require.cache = tmp;

    return ret;
};
