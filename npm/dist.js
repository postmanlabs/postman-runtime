const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    { rm, mkdir } = require('shelljs'),
    browserify = require('browserify'),

    INPUT = path.join(__dirname, '../index.js'),
    OUT_DIR = path.join(__dirname, '../dist'),
    OUTPUT = path.join(OUT_DIR, 'index.js');

console.info(chalk.yellow.bold('Generating bundle in "dist" directory...'));

rm('-rf', OUT_DIR);
mkdir('-p', OUT_DIR);

// First, override locales exported by faker otherwise all the locales data will be
// bundled by browserify.
fs.writeFileSync(require.resolve('faker/lib/locales'),
    // only export `en` locale as required by postman-collection
    // refer: https://github.com/postmanlabs/postman-collection/blob/v3.6.7/lib/superstring/dynamic-variables.js#L1
    "exports['en'] = require('./locales/en');"); // eslint-disable-line quotes

browserify(INPUT, { standalone: 'PostmanRuntime' }).bundle((err, bundle) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    require('terser').minify(bundle.toString(), {
        compress: true, // enable compression
        mangle: true, // Mangle names
        safari10: true, // Work around the Safari 10/11 await bug (bugs.webkit.org/show_bug.cgi?id=176685)
        format: {
            comments: false // Omit comments in the output
        }
    }).then(({ code }) => {
        fs.writeFileSync(OUTPUT, code);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
});
