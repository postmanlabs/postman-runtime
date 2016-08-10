var fs = require('fs'),
    path = require('path');

module.exports = {
    sugarjs: fs.readFileSync(path.join(__dirname, 'vendor', 'sugar.min.js')),
    requires: [
        {
            name: 'lodash',
            object: '_',
            require: 'lodash'
        },
        {
            name: 'crypto-all',
            object: 'CryptoJS',
            require: 'crypto-js'
        },
        {
            name: 'tv4',
            object: 'tv4',
            require: 'tv4'
        },
        {
            name: 'cheerio',
            object: 'cheerio',
            require: 'cheerio'
        },
        {
            name: 'backbone',
            object: 'Backbone',
            require: 'backbone'
        },
        {
            name: 'xml2js',
            object: 'xml2js',
            require: 'xml2js'
        },
        {
            name: 'atob',
            object: 'atob',
            require: 'atob'
        },
        {
            name: 'btoa',
            object: 'btoa',
            require: 'btoa'
        },
        // {
        //     name: 'JSON',
        //     object: 'JSON',
        //     require: JSON
        // },
        {
            name: 'buffer',
            object: 'Buffer',
            require: 'buffer'
        }
    ]
};
