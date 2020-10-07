const expect = require('chai').expect,
    // eslint-disable-next-line security/detect-child-process
    exec = require('child_process').execSync,

    nodeVersion = parseInt(process.versions.node, 10);

describe('npm publish', function () {
    // @todo remove when drop support for Node < 10
    if (nodeVersion < 10) { return; }

    const stdout = exec('npm pack --dry-run --json').toString(),
        packageInfo = JSON.parse(stdout.substring(stdout.indexOf('[')))[0],
        packagedFiles = packageInfo.files.map(function (file) { return file.path; });

    it('should have a valid package name', function () {
        expect(packageInfo.name).to.equal('postman-runtime');
    });

    it('should not publish unnecessary files', function () {
        const allowedFiles = ['index.js', 'package.json', 'LICENSE.md', 'README.md', 'CHANGELOG.yaml'];

        packagedFiles.forEach(function (path) {
            expect(allowedFiles.includes(path) ||
                path.startsWith('lib/') ||
                path.startsWith('dist/')).to.be.true;
        });
    });
});
