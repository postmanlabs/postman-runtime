var fs = require('fs'),
    yaml = require('js-yaml');

describe('travis.yml', function () {
    var travisYAML,
        packageFile,
        travisYAMLError;

    try {
        travisYAML = yaml.load(fs.readFileSync('.travis.yml').toString());
    }
    catch (e) {
        travisYAMLError = e;
    }

    // No try-catch here, any errors will be caught by the package.json tests.
    packageFile = JSON.parse(fs.readFileSync('package.json').toString());

    it('should exist', function (done) {
        fs.stat('.travis.yml', done);
    });

    it('should be a valid yml', function () {
        expect(travisYAMLError && travisYAMLError.message || travisYAMLError).to.be.undefined;
    });

    describe('structure', function () {
        it('should have the language set to node', function () {
            expect(travisYAML.language).to.equal('node_js');
            expect(travisYAML.node_js).to.eql([10, 12]);
        });

        it('should test for defined node engine version', function () {
            expect(travisYAML.node_js).to.include(Number(packageFile.engines.node.substr(2)));
        });
    });
});
