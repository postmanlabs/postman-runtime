var path = require('path'),
    projectDir = path.join(__dirname, '..', '..');


module.exports = {
    entry: path.join(__dirname, 'miley-cyrus', 'assets', 'main.js'),
    output: {
        path: path.join(__dirname, 'miley-cyrus', 'assets'),
        filename: "requires.js"
    },
    module: {
        loaders: [
            {
                loader: 'json-loader',
                test: /\.json$/
            }
        ]
    }
};
