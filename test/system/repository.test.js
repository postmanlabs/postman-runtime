/**
 * @fileOverview This test specs runs tests on the package.json file of repository. It has a set of strict tests on the
 * content of the file as well. Any change to package.json must be accompanied by valid test case in this spec-sheet.
 */
var _ = require('lodash'),
    expect = require('expect.js'),
    parseIgnore = require('parse-gitignore');

/* global describe, it */
describe('project repository', function () {
    var fs = require('fs');

    describe('package.json', function () {
        var content,
            json;

        it('must exist', function (done) {
            fs.stat('./package.json', done);
        });

        it('must have readable content', function () {
            expect(content = fs.readFileSync('./package.json').toString()).to.be.ok();
        });

        it('content must be valid JSON', function () {
            expect(json = JSON.parse(content)).to.be.ok();
        });

        describe('package.json JSON data', function () {
            it('must have valid name, description and author', function () {
                expect(json.name).to.equal('postman-runtime');
                expect(json.description)
                    .to.equal('Underlying library of executing Postman Collections (used by Newman)');
                expect(json.author).to.equal('Postman Labs <help@getpostman.com>');
                expect(json.license).to.equal('Apache-2.0');
            });

            it('must have a valid version string in form of <major>.<minor>.<revision>', function () {
                expect(json.version)
                    // eslint-disable-next-line max-len
                    .to.match(/^((\d+)\.(\d+)\.(\d+))(?:-([\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*))?(?:\+([\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*))?$/);
            });
        });

        // @todo redesign the tests to use the script values as assertion source
        describe('script definitions', function () {
            it('files must exist', function () {
                var scriptRegex = /^node\snpm\/.+\.js$/;

                expect(json.scripts).to.be.ok();
                json.scripts && Object.keys(json.scripts).forEach(function (scriptName) {
                    if (scriptName === 'memory-check') { return; }
                    expect(scriptRegex.test(json.scripts[scriptName])).to.be.ok();
                    expect(fs.statSync('npm/' + scriptName + '.js')).to.be.ok();
                });
            });

            it('must have the hashbang defined', function () {
                json.scripts && Object.keys(json.scripts).forEach(function (scriptName) {
                    if (scriptName === 'memory-check') { return; }
                    var fileContent = fs.readFileSync('npm/' + scriptName + '.js').toString();
                    expect(/^#!\/(bin\/bash|usr\/bin\/env\snode)[\r\n][\W\w]*$/g.test(fileContent)).to.be.ok();
                });
            });
        });

        describe('dependencies', function () {
            it('must exist', function () {
                expect(json.dependencies).to.be.a('object');
            });

            // Hawk library v6.0.2+ uses ES2017 and is not compatible with Node <8.
            it('hawk version', function () {
                expect(json.dependencies.hawk).to.be('6.0.2');
            });

            it('must point to a valid semver', function () {
                var packages = _.without(Object.keys(json.dependencies),
                    // These are trusted packages
                    'request', 'postman-collection', 'serialised-error');
                packages.forEach(function (dependencyName) {
                    expect(json.dependencies[dependencyName]).to.match(new RegExp('^((\\d+)\\.(\\d+)\\.(\\d+))(?:-' +
                        '([\\dA-Za-z\\-]+(?:\\.[\\dA-Za-z\\-]+)*))?(?:\\+([\\dA-Za-z\\-]+(?:\\.[\\dA-Za-z\\-]+)*))?$'));
                });
            });
        });

        describe('devDependencies', function () {
            it('must exist', function () {
                expect(json.devDependencies).to.be.a('object');
            });

            it('must point to a valid semver', function () {
                Object.keys(json.devDependencies).forEach(function (dependencyName) {
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
            it('must point to a valid file', function (done) {
                expect(json.main).to.equal('index.js');
                fs.stat(json.main, done);
            });
        });
    });

    describe('README.md', function () {
        it('must exist', function (done) {
            fs.stat('./README.md', done);
        });

        it('must have readable content', function () {
            expect(fs.readFileSync('./README.md').toString()).to.be.ok();
        });
    });

    describe('LICENSE.md', function () {
        it('must exist', function (done) {
            fs.stat('./LICENSE.md', done);
        });

        it('must have readable content', function () {
            expect(fs.readFileSync('./LICENSE.md').toString()).to.be.ok();
        });
    });

    describe('.ignore files', function () {
        var gitignorePath = '.gitignore',
            npmignorePath = '.npmignore',
            npmignore = parseIgnore(npmignorePath),
            gitignore = parseIgnore(gitignorePath);

        describe(gitignorePath, function () {
            it('must exist', function (done) {
                fs.stat(gitignorePath, done);
            });

            it('must have valid content', function () {
                expect(_.isEmpty(gitignore)).to.not.be.ok();
            });
        });

        describe(npmignorePath, function () {
            it('must exist', function (done) {
                fs.stat(npmignorePath, done);
            });

            it('must have valid content', function () {
                expect(_.isEmpty(npmignore)).to.not.be.ok();
            });
        });

        it('.gitignore coverage must be a subset of .npmignore coverage', function () {
            expect(_.intersection(gitignore, npmignore)).to.eql(gitignore);
        });
    });
});
