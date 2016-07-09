var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    xmltojs = require('xml2js');

module.exports = {
    sugarjs: fs.readFileSync(path.join(__dirname, 'vendor', 'sugar.min.js')),
    requires: _.indexBy([
        {
            name: 'lodash',
            object: '_',
            value: require('lodash')
        },
        {
            name: 'crypto-all',
            object: 'CryptoJS',
            value: require('crypto-js')
        },
        {
            name: 'tv4',
            object: 'tv4',
            value: require('tv4')
        },
        {
            name: 'cheerio',
            object: 'cheerio',
            value: require('cheerio')
        },
        {
            name: 'backbone',
            object: 'Backbone',
            value: require('backbone')
        },
        {
            name: 'xml2js',
            object: 'xml2Json',
            value: function (string) {
                var JSON = {};
                xmltojs.parseString(string, {
                    explicitArray: false,
                    async: false,
                    trim: true,
                    mergeAttrs: false
                }, function (err, result) {
                    JSON = result;
                });
                return JSON;
            }
        },
        {
            name: 'atob',
            object: 'atob',
            value: require('atob')
        },
        {
            name: 'btoa',
            object: 'btoa',
            value: require('btoa')
        },
        {
            name: 'JSON',
            object: 'JSON',
            value: JSON
        },
        {
            name: 'buffer',
            object: 'Buffer',
            value: Buffer
        }
    ], 'name')
};
