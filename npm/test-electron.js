const fs = require('fs'),
    chalk = require('chalk'),
    { exec, mkdir, test } = require('shelljs'),

    OUT_DIR = 'out/electron',
    OUT_PATH = OUT_DIR + '/test-integration.js',
    ELECTRON_BIN = './node_modules/.bin/electron';

console.info(chalk.yellow.bold('Running integration tests within electron...'));

if (!test('-e', ELECTRON_BIN)) {
    console.info(chalk.yellow.red('Missing electron binary!'));
    process.exit(1);
}

!test('-d', OUT_DIR) && mkdir('-p', OUT_DIR);

fs.writeFileSync(OUT_PATH, `
const {app} = require('electron');

app.on('ready', function () {
    console.info(process.versions);
    require('../../npm/test-integration.js')(process.exit);
});
`.trim());

exec(`${ELECTRON_BIN} ${OUT_PATH} --color always`, process.exit);
