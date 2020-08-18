const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    {rm, mkdir} = require('shelljs'),
    browserify = require('browserify'),

    INPUT = path.join(__dirname, '../index.js'),
    OUT_DIR = path.join(__dirname, '../dist'),
    OUTPUT = path.join(OUT_DIR, 'index.js');

console.info(chalk.yellow.bold('Generating bundle in "dist" directory...'));

rm('-rf', OUT_DIR);
mkdir('-p', OUT_DIR);

browserify(INPUT, {standalone: 'PostmanRuntime'}).bundle((err, bundle) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    // terser requires Node.js >= 8
    try {
        require('terser').minify(bundle.toString(), {mangle: true})
            .then(({code}) => {
                fs.writeFileSync(OUTPUT, code);
            })
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
    }
    catch (error) {
        console.info(chalk.red.bold('Compression failed!'));

        // write uncompressed file and don't end with exit code 1
        fs.writeFileSync(OUTPUT, bundle);
    }
});
