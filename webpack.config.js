/**
 * Config to convert the node ESM module into common js module to make it
 * compatible with the browserify on npm run dist - refer npm/dist.js
*/

const path = require('path'),
    jwtEntry = './node_modules/jose/dist/browser/index.js',
    jwtOutput = './node_modules/jose/dist/browser/bundle.js';

module.exports = {
    entry: {
        [jwtOutput]: jwtEntry
    },
    output: {
        path: path.resolve(__dirname),
        filename: '[name]',
        library: {
            type: 'commonjs2'
        }
    },
    mode: 'production'
};
