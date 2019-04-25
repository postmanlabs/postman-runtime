var expect = require('chai').expect,
    sinon = require('sinon');

describe('sandbox library - AJV', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: 'https://postman-echo.com/get',
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: `
                            var Ajv = require('ajv'),
                            schema = {
                                "properties": {
                                    "alpha": {
                                        "type": "boolean"
                                    }
                                }
                            };

                            pm.test("ajv.validate", function () {
                                var ajv = new Ajv({logger: false});

                                pm.expect(ajv.validate(schema, {alpha: true})).to.be.true;
                                pm.expect(ajv.validate(schema, {alpha: 123})).to.be.false;
                            });

                            pm.test("ajv.compile", function () {
                                var ajv = new Ajv({logger: false}),
                                    validate = ajv.compile(schema);

                                pm.expect(validate({alpha: true})).to.be.true;
                                pm.expect(validate({alpha: 123})).to.be.false;
                            });
                            `
                        }
                    }]
                }, {
                    request: 'https://postman-echo.com/get',
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: `
                            var Ajv = require('ajv'),

                            SCHEMAS = {
                                'https://schema.getpostman.com/collection.json': {
                                    $id: 'https://schema.getpostman.com/collection.json',
                                    required: ['request'],
                                    properties: {
                                        name: {
                                            type: 'string'
                                        },
                                        request: {
                                            $ref: 'request.json'
                                        }
                                    }
                                },
                                'https://schema.getpostman.com/request.json': {
                                    $id: 'https://schema.getpostman.com/request.json',
                                    required: ['url'],
                                    properties: {
                                        method: {
                                            type: 'string'
                                        },
                                        url: {
                                            $ref: 'url.json'
                                        }
                                    }
                                },
                                'https://schema.getpostman.com/url.json': {
                                    $id: 'https://schema.getpostman.com/url.json',
                                    properties: {
                                        protocol: {
                                            type: 'string'
                                        },
                                        host: {
                                            type: 'string'
                                        }
                                    }
                                }
                            },

                            ajv = new Ajv({
                                logger: false,
                                loadSchema: function(uri) {
                                    return new Promise(function(resolve, reject) {
                                        setTimeout(function() {
                                            SCHEMAS[uri] ? resolve(SCHEMAS[uri]) : reject(new Error('404'));
                                        }, 10);
                                    });
                                }
                            }),

                            valid;

                            ajv.compileAsync(SCHEMAS['https://schema.getpostman.com/collection.json'])
                                .then(function(validate) {
                                    valid = validate({
                                        name: 'test',
                                        request: {
                                            method: 'GET',
                                            url: 'https://getpostman.com'
                                        }
                                    });
                                });

                            // this hack is required for promises
                            setTimeout(function() {
                                pm.test("ajv.compileAsync", function () {
                                    pm.expect(valid).to.be.true;
                                });
                            }, 100);
                            `
                        }
                    }]
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should complete the run', function () {
        expect(testrun).to.be.ok;
        sinon.assert.calledOnce(testrun.start);
        sinon.assert.calledOnce(testrun.done);
        sinon.assert.calledWith(testrun.done.getCall(0), null);

        sinon.assert.calledTwice(testrun.request);
        sinon.assert.calledWith(testrun.request.getCall(0), null);
        sinon.assert.calledWith(testrun.request.getCall(1), null);

        sinon.assert.calledTwice(testrun.response);
        sinon.assert.calledWith(testrun.response.getCall(0), null);
        sinon.assert.calledWith(testrun.response.getCall(1), null);
    });

    it('should run the test script successfully', function () {
        sinon.assert.calledTwice(testrun.script);
        sinon.assert.calledWith(testrun.script.getCall(0), null);
        sinon.assert.calledWith(testrun.script.getCall(1), null);

        sinon.assert.calledTwice(testrun.test);
        sinon.assert.calledWith(testrun.script.getCall(0), null);
        sinon.assert.calledWith(testrun.script.getCall(1), null);

        sinon.assert.calledThrice(testrun.assertion);

        expect(testrun.assertion.getCall(0).args[1][0]).to.include({
            error: null,
            index: 0,
            passed: true,
            skipped: false,
            name: 'ajv.validate'
        });

        expect(testrun.assertion.getCall(1).args[1][0]).to.include({
            error: null,
            index: 1,
            passed: true,
            skipped: false,
            name: 'ajv.compile'
        });

        expect(testrun.assertion.getCall(2).args[1][0]).to.include({
            error: null,
            index: 0,
            passed: true,
            skipped: false,
            name: 'ajv.compileAsync'
        });
    });
});
