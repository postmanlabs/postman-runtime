const sdk = require('postman-collection'),
    sinon = require('sinon').createSandbox(),
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
                                id: 'nested-request-id',
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

    it('should throw an error in script if request resolver is not passed and runRequest is invoked', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: { exec: 'await pm.execution.runRequest("nested-request-id");' }
                }],
                request: {
                    url: 'https://postman-echo.com/get',
                    method: 'GET'
                }
            }]
        });

        new collectionRunner().run(collection, {}, function (_err, run) {
            run.start({
                exception (_cursor, err) {
                    expect(err.message).to.be.ok;
                    expect(err.message.includes('pm.execution.runRequest is not a function')).to.be.true;
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
                                id: 'nested-request-id',
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
                                id: 'nested-request-id',
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
                                id: 'nested-request-id',
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
                            pm.expect(pm.collectionVariables.get("api_path")).to.equal("get");
                        });`
                    }
                }, {
                    listen: 'test',
                    script: {
                        exec: `
                        console.log(pm.collectionVariables.get("api_path"), pm.response);

                        pm.test('url should have been resolved via var set from nested req', function () {
                            pm.expect(pm.response.code).to.equal(200);
                        });`
                    }
                }],
                request: {
                    url: 'https://{{api_url}}/{{api_path}}',
                    method: 'GET'
                }
            }],
            variable: [{ key: 'api_method', value: 'post' }]
        });

        new collectionRunner().run(collection,
            {
                script: {
                    requestResolver (_requestId, callback) {
                        callback(null, {
                            item: {
                                id: 'nested-request-id',
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: `
                                            pm.globals.set("api_url", "postman-echo.com");
                                            pm.collectionVariables.set("api_path", "get");
                                            `
                                        }
                                    },
                                    {
                                        listen: 'test',
                                        script: {
                                            exec: `
                                            pm.test('url should have been resolved via var set from parent',
                                            function () {
                                                pm.expect(pm.collectionVariables.get("api_method")).to.equal("post");
                                                pm.expect(pm.response.code).to.equal(200);
                                            });`
                                        }
                                    }
                                ],
                                request: {
                                    url: 'https://{{api_url}}/{{api_method}}',
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
                                    'url should have been resolved via var set from nested req',
                                    'url should have been resolved via var set from parent'
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
                                id: 'nested-request-id',
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

    it('should handle number of requests limitation set by opts.maxInvokableNestedRequests', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `
                            await pm.execution.runRequest('nested-request-id');
                            await pm.execution.runRequest('nested-request-id');
                            await pm.execution.runRequest('nested-request-id');
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
                                id: 'nested-request-id',
                                event: [],
                                request: {
                                    url: 'https://postman-echo.com/post',
                                    method: 'POST'
                                }
                            }
                        });
                    }
                },
                maxInvokableNestedRequests: 2
            },
            function (_err, run) {
                run.start({
                    exception (_cursor, err) {
                        expect(err.message).to.eql('The maximum number of pm.execution.runRequest()' +
                            ' calls have been reached for this request.');
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('should correctly handle iterationData passed', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `
                            console.log("[l0]", pm.iterationData.get("foo"));
                            await pm.execution.runRequest('nested-request-id');
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
                                id: 'nested-request-id',
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: `
                                                console.log("[l1]", pm.iterationData.get("foo"));
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
                },
                iterationCount: 2,
                data: [{ foo: 123 }, null, { foo: 456 }]
            },
            function (_err, run) {
                let lastRecordedValueOfFooInParentRequest;

                run.start({
                    console (_cursor, ...args) {
                        if (args.includes('[l0]')) {
                            lastRecordedValueOfFooInParentRequest = args.pop();
                        }

                        if (args.includes('[l1]')) {
                            const valueOfFooInNestedRequest = args.pop();

                            expect(lastRecordedValueOfFooInParentRequest).to.eql(valueOfFooInNestedRequest);
                        }
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('should correctly handle cursor passed for root request in original', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `
                        console.log("[l0]");
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
                                id: 'nested-request-id',
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: `
                                                console.log("[l1] Log from level-1");

                                                pm.test('assertion from level 1', function () {
                                                    pm.expect(1).to.eql(1);
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
            },
            function (_err, run) {
                let rootReqCursor;

                run.start({
                    console (cursor, ...args) {
                        if (args.includes('[l0]')) {
                            rootReqCursor = cursor;
                        }
                        else {
                            // Validate child request's cursor
                            expect(cursor).to.be.ok;
                            expect(cursor.ref).to.eql(rootReqCursor.ref);
                            expect(cursor.scriptId).to.eql(rootReqCursor.scriptId);
                            expect(cursor.position).to.eql(rootReqCursor.position);
                        }
                    },
                    assertion (cursor) {
                        // Validate child request's cursor
                        expect(cursor).to.be.ok;
                        expect(cursor.ref).to.eql(rootReqCursor.ref);
                        expect(cursor.scriptId).to.eql(rootReqCursor.scriptId);
                        expect(cursor.position).to.eql(rootReqCursor.position);
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('should correctly handle vault mutations and access across request executions', function (done) {
        const vaultSecrets = new sdk.VariableScope({
                prefix: 'vault:',
                _allowScriptAccess: () => {
                    return true;
                }
            }),
            collection = new sdk.Collection({
                item: [{
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: `
                            await pm.execution.runRequest("nested-request-id");
                            pm.test('secret should have been set in parent request', async function () {
                                pm.expect(await pm.vault.get("secretKey")).to.equal("secretValue");
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
                vaultSecrets: vaultSecrets,
                script: {
                    requestResolver (_requestId, callback) {
                        callback(null, {
                            item: {
                                id: 'nested-request-id',
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: 'await pm.vault.set("secretKey", "secretValue");'
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
            },
            function (_err, run) {
                run.start({
                    script (_err, _cursor, result, _script, event) {
                        if (event.listen === 'prerequest') {
                            expect(result.vaultSecrets).to.be.ok;
                            // Mutation should be applied and present
                            expect(result.vaultSecrets.get('secretKey')).to.eql('secretValue');
                            expect(result.vaultSecrets.mutations).to.be.ok;
                            expect(result.vaultSecrets.mutations.compacted)
                                .to.deep.include({ secretKey: ['secretKey', 'secretValue'] });
                        }
                    },
                    assertion (_cursor, assertions) {
                        assertions.forEach((assertion) => {
                            expect(assertion.passed).to.be.true;
                        });
                    },
                    done (err) {
                        done(err);
                    }
                });
            });
    });

    it('should not abort execution on encountering failure in nested request assertions', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [{
                    listen: 'prerequest',
                    script: {
                        exec: `
                        await pm.execution.runRequest("nested-request-id");
                        pm.test('[l0-prerequest] this test should have run', function () {
                            pm.expect(true).to.equal(true);
                        });
                    `
                    }
                }, {
                    listen: 'test',
                    script: {
                        exec: `
                        pm.test('[l0-test] this test should also have run', function () {
                            pm.expect(true).to.equal(false);
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
                                id: 'nested-request-id',
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: `
                                            pm.test('[l1-failure-test] this test should have failed', function () {
                                                pm.expect(true).to.equal(false);
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
            },
            function (_err, run) {
                let assertionCount = 0,
                    expectedOrder = [false, true, false],
                    actualOrder = []; // Expected order of assertion results

                run.start({
                    assertion (_cursor, assertions) {
                        assertions.forEach((assertion) => {
                            assertionCount++;
                            actualOrder.push(assertion.passed);
                        });
                    },
                    done (err) {
                        expect(assertionCount).to.eql(3); // All 3 assertions should have run
                        expect(actualOrder).to.deep.eql(expectedOrder);
                        done(err);
                    }
                });
            });
    });

    it('should invoke passed-down request trigger callback', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [
                    {
                        listen: 'prerequest',
                        script: {
                            exec: `
                            await pm.execution.runRequest(
                                "nested-request-id",
                                { variables: { method: "post" } }
                            );
                            `
                        }
                    }
                ],
                request: {
                    url: 'https://postman-echo.com/{{parent_method}}',
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
                                id: 'nested-request-id',
                                event: [
                                    {
                                        listen: 'prerequest',
                                        script: {
                                            exec: 'pm.globals.set("parent_method", "get");'
                                        }
                                    }
                                ],
                                request: {
                                    url: 'https://postman-echo.com/{{method}}',
                                    method: 'POST'
                                }
                            }
                        });
                    }
                }
            },
            function (_err, run) {
                let requestConsoleInvocationCount = 0,
                    invocationOrder = [];

                run.start({
                    request (_err, cursor, response, request, item, cookies, history) {
                        requestConsoleInvocationCount++;
                        invocationOrder.push(request.url.toString());

                        expect(history.execution).to.be.ok;
                        expect(response.status).to.be.ok;

                        if (requestConsoleInvocationCount === 1) {
                            // For nested request cursors: scriptId should be non-empty
                            // Used by consumers to mark the log as an indirect request
                            expect(cursor.scriptId).to.be.ok;
                        }

                        expect(request).to.be.ok;
                        expect(item).to.be.ok;
                        expect(cookies).to.be.ok;
                    },
                    done (err) {
                        expect(requestConsoleInvocationCount).to.eql(2); // Nested request + Parent request
                        expect(invocationOrder).to.deep.equal([
                            'https://postman-echo.com/post', 'https://postman-echo.com/get'
                        ]);
                        done(err);
                    }
                });
            });
    });

    it('should not invoke any events if root request is cancelled', function (done) {
        const collection = new sdk.Collection({
            item: [{
                event: [
                    {
                        listen: 'prerequest',
                        script: { exec: 'await pm.execution.runRequest("nested-request-id");' }
                    }
                ],
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
                                id: 'nested-request-id',
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
                const callbacks = {
                    start: sinon.spy(),
                    abort: sinon.spy(),
                    request: sinon.spy()
                };

                callbacks.done = sinon.spy(function () {
                    expect(run.state.nestedRequest).to.be.undefined;
                    expect(callbacks).to.be.ok;
                    expect(callbacks.done.getCall(0).args[0]).to.be.null;
                    expect(callbacks).to.nested.include({
                        'start.calledOnce': true,
                        'abort.calledOnce': true,
                        'request.calledOnce': false
                    });

                    return done();
                });

                run.start(callbacks);
                // Abort root run
                run.abort();
            });
    });
});
