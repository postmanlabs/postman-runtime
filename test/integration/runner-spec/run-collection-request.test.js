const sdk = require('postman-collection'),
    collectionRunner = require('../../../lib/runner');

describe('pm.execution.runRequest handling', function () {
    it('[overview] should receive calls from postman-sandbox, resolve a request using bridge & ' +
        'make an API call to return a response',
    function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'test',
                    script: {
                        exec: `
                            console.log("Response from self endpoint", pm.response.json());
                            const response = await pm.execution.runRequest('nested-request-id');
                            pm.test('response should be received from nested request', function () {
                                pm.expect(response.code).to.equal(200);
                                pm.expect(response.json()).to.be.ok;
                            });
                        `
                    }
                }],
                request: {
                    url: 'https://postman-echo.com/get',
                    method: 'GET'
                }
            }]
        });

        new collectionRunner().run(collection,
            {
                script: {
                    requestResolver (_requestId, callback) {
                        callback(null, {
                            item: {
                                request: {
                                    url: 'https://postman-echo.com/post',
                                    method: 'POST'
                                }
                            }
                        });
                    }
                }
            },
            function (_err, run) {
                run.start({
                    assertion (_cursor, assertionOutcomes) {
                        const internalRequestAssertions = assertionOutcomes
                            .filter(function (outcome) {
                                return outcome.name === 'response should be received from nested request';
                            });

                        internalRequestAssertions.forEach(function (assertion) {
                            expect(assertion.passed).to.be.true;
                        });
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('should handle for exceptions thrown from nested request parsing or uncaught errors', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `
                        try {
                            await pm.execution.runRequest("nested-request-id");
                        } catch (error) {
                            pm.test('error should have been thrown',function  () {
                                pm.expect(true).to.be.true;
                            })
                        }
                        `
                    }
                }],
                request: {
                    url: 'https://postman-echo.com/get',
                    method: 'GET'
                }
            }]
        });

        new collectionRunner().run(collection,
            {
                script: {
                    requestResolver (_requestId, callback) {
                        callback(null, {
                            item: {
                                event: [{
                                    listen: 'test',
                                    script: { exec: 'try { some invalid js code here ' }
                                }],
                                request: {
                                    url: 'https://postman-echo.com/get'
                                }
                            }
                        });
                    }
                }
            }, function (_err, run) {
                run.start({
                    assertion (_cursor, assertionOutcomes) {
                        const reqAssertions = assertionOutcomes
                            .filter(function (outcome) {
                                return outcome.name === 'error should have been thrown';
                            });

                        reqAssertions.forEach(function (assertion) {
                            expect(assertion.passed).to.be.true;
                        });
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('[var sync] should preserve scopes defined between parent and nested request', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `
                        a = 1;
                        await pm.execution.runRequest("nested-request-id");`
                    }
                }],
                request: {
                    url: 'https://postman-echo.com/get',
                    method: 'GET'
                }
            }]
        });

        new collectionRunner().run(collection,
            {
                script: {
                    requestResolver (_requestId, callback) {
                        callback(null, {
                            item: {
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: `
                                                pm.test('variable passed from top scope should be received',
                                                function () {
                                                    pm.expect(a).to.equal(1);
                                                });
                                            `
                                        }
                                    }
                                ],
                                request: {
                                    url: 'https://postman-echo.com/post',
                                    method: 'POST'
                                }
                            }
                        });
                    }
                }
            }, function (_err, run) {
                run.start({
                    assertion (_cursor, assertionOutcomes) {
                        const reqAssertions = assertionOutcomes
                            .filter(function (outcome) {
                                return outcome.name === 'variable passed from top scope should be received';
                            });

                        reqAssertions.forEach(function (assertion) {
                            expect(assertion.passed).to.be.true;
                        });
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('[var sync] should execute nested req\'s scripts & resolve parent environment variables', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `
                        pm.environment.set("api_url", "postman-echo.com");
                        await pm.execution.runRequest("nested-request-id");`
                    }
                }],
                request: {
                    url: 'https://postman-echo.com/get',
                    method: 'GET'
                }
            }]
        });

        new collectionRunner().run(collection,
            {
                script: {
                    requestResolver (_requestId, callback) {
                        callback(null, {
                            item: {
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: `
                                                pm.test('variable values should have been received', function () {
                                                    pm.expect(pm.environment.get("api_url"))
                                                        .to.equal("postman-echo.com");
                                                });
                                            `
                                        }
                                    },
                                    {
                                        listen: 'test',
                                        script: {
                                            exec: `
                                                pm.test('variable values should have been resolved for url',
                                                function () {
                                                    pm.expect(pm.response.code).to.equal(200);
                                                });
                                            `
                                        }
                                    }
                                ],
                                request: {
                                    url: 'https://{{api_url}}/post',
                                    method: 'POST'
                                }
                            }
                        });
                    }
                }
            },
            function (_err, run) {
                run.start({
                    assertion (_cursor, assertionOutcomes) {
                        const internalRequestAssertions = assertionOutcomes
                            .filter(function (outcome) {
                                return [
                                    'variable values should have been received',
                                    'variable values should have been resolved for url'
                                ].includes(outcome.name);
                            });

                        internalRequestAssertions.forEach(function (assertion) {
                            expect(assertion.passed).to.be.true;
                        });
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('[var sync] should execute nested req\'s scripts & bubble up var mutations to parent', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `await pm.execution.runRequest("nested-request-id");

                        pm.test('variable values should have been updated from nested request', function () {
                            pm.expect(pm.globals.get("api_url")).to.equal("postman-echo.com");
                        });`
                    }
                }, {
                    listen: 'test',
                    script: {
                        exec: `
                        pm.test('url should have been resolved via var set from nested req', function () {
                            pm.expect(pm.response.code).to.equal(200);
                        });`
                    }
                }],
                request: {
                    url: 'https://{{api_url}}/get',
                    method: 'GET'
                }
            }]
        });

        new collectionRunner().run(collection,
            {
                script: {
                    requestResolver (_requestId, callback) {
                        callback(null, {
                            item: {
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: 'pm.globals.set("api_url", "postman-echo.com");'
                                        }
                                    }
                                ],
                                request: {
                                    url: 'https://{{api_url}}/post',
                                    method: 'POST'
                                }
                            }
                        });
                    }
                }
            },
            function (_err, run) {
                run.start({
                    assertion (_cursor, assertionOutcomes) {
                        const reqAssertions = assertionOutcomes
                            .filter(function (outcome) {
                                return [
                                    'variable values should have been updated from nested request',
                                    'url should have been resolved via var set from nested req'
                                ].includes(outcome.name);
                            });

                        reqAssertions.forEach(function (assertion) {
                            expect(assertion.passed).to.be.true;
                        });
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('[var sync] should use passed collection vars & merge parent\'s collection vars to globals', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `
                        pm.collectionVariables.set("api_url", "postman-echo.com");
                        await pm.execution.runRequest("nested-request-id");`
                    }
                }],
                request: {
                    url: 'https://{{api_url}}/{{api_method}}',
                    method: 'GET'
                }
            }],
            variable: [{ key: 'api_method', value: 'get' }]
        });

        new collectionRunner().run(collection,
            {
                script: {
                    requestResolver (_requestId, callback) {
                        callback(null, {
                            item: {
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: `
                                            pm.test("global var should be set from collection variable of parent",
                                            function () {
                                                pm.expect(pm.collectionVariables.get("api_url")).to.equal("postman-echo.com");
                                                pm.expect(pm.collectionVariables.get("api_method")).to.equal("get");
                                            });`
                                        }
                                    }
                                ],
                                request: {
                                    url: 'https://{{api_url}}/{{api_method}}',
                                    method: 'GET'
                                }
                            }
                        });
                    }
                }
            },
            function (_err, run) {
                run.start({
                    assertion (_cursor, assertionOutcomes) {
                        const reqAssertions = assertionOutcomes
                            .filter(function (outcome) {
                                return outcome.name === 'global var should be set from collection variable of parent';
                            });

                        reqAssertions.forEach(function (assertion) {
                            expect(assertion.passed).to.be.true;
                        });
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('should handle pm.execution.skipRequest', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `const response = await pm.execution.runRequest("nested-request-id");

                        pm.test('response should be null', function () {
                            pm.expect(response).to.be.null;
                        }`
                    }
                }],
                request: {
                    url: 'https://postman-echo.com/get',
                    method: 'GET'
                }
            }]
        });

        new collectionRunner().run(collection,
            {
                script: {
                    requestResolver (_requestId, callback) {
                        callback(null, {
                            item: {
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: 'pm.execution.skipRequest();'
                                        }
                                    }
                                ],
                                request: {
                                    // This would technically fail,
                                    // but we wouldn't get here because skipRequest would be called
                                    url: 'https://{{api_url}}/post',
                                    method: 'POST'
                                }
                            }
                        });
                    }
                }
            },
            function (_err, run) {
                run.start({
                    assertion (_cursor, assertionOutcomes) {
                        const reqAssertions = assertionOutcomes
                            .filter(function (outcome) {
                                return outcome.name === 'response should be null';
                            });

                        reqAssertions.forEach(function (assertion) {
                            expect(assertion.passed).to.be.true;
                        });
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });
});
