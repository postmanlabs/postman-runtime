var fs = require('fs'),
    yaml = require('js-yaml');

describe('travis.yml', function () {
    var travisYAML,
        packageFile,
        travisYAMLError;

    try {
        travisYAML = yaml.safeLoad(fs.readFileSync('.travis.yml').toString());
    }
    catch (e) {
        travisYAMLError = e;
    }

    // No try-catch here, any errors will be caught by the package.json tests.
    packageFile = JSON.parse(fs.readFileSync('package.json').toString());

    it('should exist', function (done) {
        fs.stat('.travis.yml', done);
    });

    it('must be a valid yml', function () {
        expect(travisYAMLError && travisYAMLError.message || travisYAMLError).to.be.undefined;
    });

    describe('structure', function () {
        it('language must be set to node', function () {
            expect(travisYAML.language).to.equal('node_js');
            expect(travisYAML.node_js).to.eql(['6', '8']);
        });

        it.skip('node version must match rest of the tests', function () {
            expect(travisYAML.node_js).to.eql([packageFile.engines.node.charAt(2)]);
        });
    });
});
