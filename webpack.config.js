/**
 * Config to convert the node ESM module into common js module to make it
 * compatible with the browserify on npm run dist - refer npm/dist.js
*/

const path = require('path'),
    entryFilePath = path.join(__dirname, './node_modules/jose/dist/browser/index.js'),
    outputFilePath = path.join(__dirname, './node_modules/jose/dist/browser');

module.exports = {
    entry: entryFilePath,
    output: {
        path: outputFilePath,
        filename: 'bundle.js',
        library: {
            type: 'commonjs2'
        }
    },
    mode: 'production'
};
