'use strict';
var ALLOWED_REQUIRES = ['lodash', 'crypto-js', 'tv4', 'cheerio', 'backbone', 'atob', 'btoa', 'xml2js', 'buffer'];

module.exports = function (moduleId) {
    if (ALLOWED_REQUIRES.indexOf(moduleId) < 0) {
        return {};  // todo: should we throw here?
    }

    // ensure that we always resolve from the current path
    var filePath = require.resolve(moduleId),
        tmp = require.cache[filePath],
        ret;

    delete require.cache[filePath];
    ret = require(filePath);
    require.cache[filePath] = tmp;

    return ret;
};
