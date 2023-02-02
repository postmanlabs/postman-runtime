const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    { rm, mkdir } = require('shelljs'),
    browserify = require('browserify'),
    webpack = require('webpack'),
    compiler = webpack({
        entry: {
            '../node_modules/jose/dist/browser/bundle.js': // entry key is the bundled output file path
            path.join(__dirname, '../node_modules/jose/dist/browser/index.js')
        },
        output: {
            path: path.resolve(__dirname),
            filename: '[name]', // entry key will be used dynamically to compute the bundled output path
            library: {
                type: 'commonjs2'
            }
        },
        mode: 'production'
    }),

    INPUT = path.join(__dirname, '../index.js'),
    OUT_DIR = path.join(__dirname, '../dist'),
    OUTPUT = path.join(OUT_DIR, 'index.js');

rm('-rf', OUT_DIR);
mkdir('-p', OUT_DIR);

console.info(chalk.yellow.bold('Generating bundle in "dist" directory...'));

compiler.run((err) => {
    // webpack bundles the esm into commonjs module for browserify compile

    if (err) {
        console.error(err);
        process.exit(1);
    }

    compiler.close((closeErr) => {
        if (closeErr) {
            console.error(closeErr);
            process.exit(1);
        }

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
    });
});
