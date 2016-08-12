'use strict';
var _cache = {},

    ALLOWED_REQUIRES = ['lodash', 'crypto-js', 'tv4', 'cheerio',
        'backbone', 'atob', 'btoa', 'xml2js', 'buffer'];

module.exports = function (moduleId) {
    if (ALLOWED_REQUIRES.indexOf(moduleId) < 0) {
        return {};  // todo: should we throw here?
    }

    // ensure that we always resolve from the current path
    var tmp = require.cache,
        ret;
    require.cache = _cache;
    ret = require(moduleId);
    require.cache = tmp;

    return ret;
};
