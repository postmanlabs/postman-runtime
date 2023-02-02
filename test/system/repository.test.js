/**
 * @fileOverview This test specs runs tests on the package.json file of repository. It has a set of strict tests on the
 * content of the file as well. Any change to package.json must be accompanied by valid test case in this spec-sheet.
 */
const fs = require('fs'),
    _ = require('lodash'),
    yml = require('js-yaml'),
    expect = require('chai').expect,
    parseIgnore = require('parse-gitignore');

describe('project repository', function () {
    describe('package.json', function () {
        var content,
            json;

        it('should exist', function (done) {
            fs.stat('./package.json', done);
        });

        it('should have readable JSON content', function () {
            expect(content = fs.readFileSync('./package.json').toString(), 'Should have readable content').to.be.ok;
        });

        it('should have valid JSON content', function () {
            expect(json = JSON.parse(content), 'Should have valid JSON content').to.be.ok;
        });

        describe('package.json JSON data', function () {
            it('should have valid name, description and author', function () {
                expect(json).to.deep.include({
                    name: 'postman-runtime',
                    description: 'Underlying library of executing Postman Collections',
                    author: 'Postman Inc.',
                    license: 'Apache-2.0'
                });
            });

            it('should have a valid version string in form of <major>.<minor>.<revision>', function () {
                expect(json.version)
                    // eslint-disable-next-line max-len, security/detect-unsafe-regex
                    .to.match(/^((\d+)\.(\d+)\.(\d+))(?:-([\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*))?(?:\+([\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*))?$/);
            });
        });

        describe('dependencies', function () {
            it('should exist', function () {
                expect(json.dependencies).to.be.an('object');
            });

            it('should point to specific package version; (*, ^, ~) not expected', function () {
                _.forEach(json.dependencies, function (dep) {
                    expect((/^\d/).test(dep)).to.be.ok;
                });
            });

            // @note tough-cookie must be bumped across the ecosystem along with
            // same-site cookie support
            it('should have dependency tough-cookie v4.1.2', function () {
                expect(json.dependencies).to.have.property('@postman/tough-cookie', '4.1.2-postman.1');
            });
        });

        describe('devDependencies', function () {
            it('should exist', function () {
                expect(json.devDependencies).to.be.an('object');
            });

            it('should point to a valid semver', function () {
                Object.keys(json.devDependencies).forEach(function (dependencyName) {
                    // eslint-disable-next-line security/detect-non-literal-regexp
                    expect(json.devDependencies[dependencyName]).to.match(new RegExp('((\\d+)\\.(\\d+)\\.(\\d+))(?:-' +
                        '([\\dA-Za-z\\-]+(?:\\.[\\dA-Za-z\\-]+)*))?(?:\\+([\\dA-Za-z\\-]+(?:\\.[\\dA-Za-z\\-]+)*))?$'));
                });
            });

            it('should not overlap devDependencies', function () {
                var clean = [];

                Object.keys(json.devDependencies).forEach(function (dependencyName) {
                    !json.dependencies[dependencyName] && clean.push(dependencyName);
                });

                expect(Object.keys(json.devDependencies)).to.eql(clean);
            });
        });

        describe('main entry script', function () {
            it('should point to a valid file', function (done) {
                expect(json.main).to.equal('index.js');
                fs.stat(json.main, done);
            });
        });
    });

    describe('README.md', function () {
        it('should exist', function (done) {
            fs.stat('./README.md', done);
        });

        it('should have readable content', function () {
            expect(fs.readFileSync('./README.md').toString()).to.be.ok;
        });
    });

    describe('LICENSE.md', function () {
        it('should exist', function (done) {
            fs.stat('./LICENSE.md', done);
        });

        it('should have readable content', function () {
            expect(fs.readFileSync('./LICENSE.md').toString()).to.be.ok;
        });
    });

    describe('.gitattributes', function () {
        it('should exist', function (done) {
            fs.stat('./.gitattributes', done);
        });

        it('should have readable content', function () {
            expect(fs.readFileSync('./.gitattributes').toString()).to.be.ok;
        });
    });

    describe('.ignore files', function () {
        var gitignorePath = '.gitignore',
            npmignorePath = '.npmignore',
            npmignore = parseIgnore(fs.readFileSync(npmignorePath)),
            gitignore = parseIgnore(fs.readFileSync(gitignorePath));

        describe(gitignorePath, function () {
            it('should exist', function (done) {
                fs.stat(gitignorePath, done);
            });

            it('should have valid content', function () {
                expect(gitignore).to.not.be.empty;
            });

            it('should ignore the dist directory', function () {
                expect(gitignore).to.include('/dist/');
            });
        });

        describe(npmignorePath, function () {
            it('should exist', function (done) {
                fs.stat(npmignorePath, done);
            });

            it('should have valid content', function () {
                expect(npmignore).to.not.be.empty;
            });

            it('should not ignore the dist directory', function () {
                expect(npmignore).not.to.include('dist/**');
            });
        });

        // eslint-disable-next-line mocha/valid-test-description
        it('.gitignore coverage must be a subset of .npmignore coverage (except dist directory)', function () {
            expect(_.intersection(gitignore, _.union(npmignore, ['/dist/']))).to.eql(gitignore);
        });
    });

    describe('CHANGELOG.yaml', function () {
        it('should exist', function (done) {
            fs.stat('./CHANGELOG.yaml', done);
        });

        it('should have readable content', function () {
            expect(yml.load(fs.readFileSync('./CHANGELOG.yaml')), 'not a valid yaml').to.be.ok;
        });
    });
});
