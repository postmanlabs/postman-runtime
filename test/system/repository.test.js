/**
 * @fileOverview This test specs runs tests on the package.json file of repository. It has a set of strict tests on the
 * content of the file as well. Any change to package.json must be accompanied by valid test case in this spec-sheet.
 */
var _ = require('lodash'),
    expect = require('expect.js');

/* global describe, it */
describe('project repository', function () {
    var fs = require('fs');

    describe('package.json', function () {
        var content,
            json;

        it('must exist', function () {
            expect(fs.existsSync('./package.json')).to.be.ok();
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
                    .to.equal('Underlyng library of executing Postman Collections (used by Newman)');
                expect(json.author).to.equal('Postman Labs <help@getpostman.com>');
                expect(json.license).to.equal('Apache-2.0');
            });

            it('must have a valid version string in form of <major>.<minor>.<revision>', function () {
                expect(json.version)
                    .to.match(/^((\d+)\.(\d+)\.(\d+))(?:-([\dA-Za-z\-]+(?:\.[\dA-Za-z\-]+)*))?(?:\+([\dA-Za-z\-]+(?:\.[\dA-Za-z\-]+)*))?$/);
            });
        });

        describe.skip('script definitions', function () {
            var props = {};

            it('files must exist', function () {
                expect(json.scripts).to.be.ok();

                Object.keys(json.scripts).forEach(function (scriptName) {
                    var base;

                    props[scriptName] = {
                        base: (base = scriptName.substr(0, scriptName.indexOf('-') > -1 ?
                            scriptName.indexOf('-') : undefined)),
                        path: 'npm/' + base + '/' + scriptName + '.js'
                    };
                    expect(fs.existsSync(props[scriptName].path)).to.be.ok();
                });
            });

            it('must be defined as per standards `[script]: scripts/[name]/[name].sh`', function () {
                Object.keys(json.scripts).forEach(function (scriptName) {
                    expect(json.scripts[scriptName]).to.match(new RegExp(props[prop].path, 'g'));
                });
            });

            it('must have the hashbang defined', function () {
                Object.keys(json.scripts).forEach(function (scriptName) {
                    var fileContent = fs.readFileSync(props[scriptName].path).toString();
                    expect(/^#!\/(bin\/bash|usr\/bin\/env\snode)[\r\n][\W\w]*$/g.test(fileContent)).to.be.ok();
                });
            });
        });

        describe('dependencies', function () {
            it('must exist', function () {
                expect(json.dependencies).to.be.a('object');
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
                    expect(json.devDependencies[dependencyName]).to.match(new RegExp('[^]((\\d+)\\.(\\d+)\\.(\\d+))(?:-' +
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
            it('must point to a valid file', function () {
                expect(json.main).to.equal('index.js');
                expect(fs.existsSync(json.main)).to.be.ok();
            });
        });
    });

    describe('README.md', function () {
        it('must exist', function () {
            expect(fs.existsSync('./README.md')).to.be.ok();
        });

        it('must have readable content', function () {
            expect(fs.readFileSync('./README.md').toString()).to.be.ok();
        });
    });

    describe('LICENSE.md', function () {
        it('must exist', function () {
            expect(fs.existsSync('./LICENSE.md')).to.be.ok();
        });

        it('must have readable content', function () {
            expect(fs.readFileSync('./LICENSE.md').toString()).to.be.ok();
        });
    });

    describe('.gitignore file', function () {
        it('must exist', function () {
            expect(fs.existsSync('./.gitignore')).to.be.ok();
        });

        it('must have readable content', function () {
            expect(fs.readFileSync('./.gitignore').toString()).to.be.ok();
        });
    });

    describe('.npmignore file', function () {
        it('must exist', function () {
            expect(fs.existsSync('./.npmignore')).to.be.ok();
        });
    });
});
