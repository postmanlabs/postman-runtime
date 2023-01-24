const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    { rm, mkdir } = require('shelljs'),
    browserify = require('browserify'),
    webpack = require('webpack'),
    webpackConfig = require(path.join(__dirname, '../webpack.config.js')),
    compiler = webpack(webpackConfig),

    INPUT = path.join(__dirname, '../index.js'),
    OUT_DIR = path.join(__dirname, '../dist'),
    OUTPUT = path.join(OUT_DIR, 'index.js');

rm('-rf', OUT_DIR);
mkdir('-p', OUT_DIR);


compiler.run((err) => {
    console.info(chalk.yellow.bold('Generating webpack bundle...'));

    if (err) {
        console.error(err);

        return;
    }

    compiler.close((closeErr) => {
        if (closeErr) {
            console.error(closeErr);

            return;
        }

        console.info(chalk.yellow.bold('Generating bundle in "dist" directory...'));

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
