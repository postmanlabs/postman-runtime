const expect = require('chai').expect,
    testSuit = [
        {
            suitName: 'when single line comment present',
            scenario: 'it should remove comments',
            scenarios: [
                {
                    rawContent: '{// some comment\n"a": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    rawContent: '{\n"a": "value"\n// "b": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    rawContent: '{// some comment\r\n"a": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    rawContent: '{\n"a": "value"\n// "b": "value"\r\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    rawContent: '{"a": "value",\n"b": "value" // some comment\n}',
                    rawContentInRequestTrigger: '{"a": "value",\n"b": "value" \n}',
                    expectedObject: { a: 'value', b: 'value' }
                },
                {
                    rawContent: '{"a": "value",\n"b": "value" // some comment\r\n}',
                    rawContentInRequestTrigger: '{"a": "value",\n"b": "value" \n}',
                    expectedObject: { a: 'value', b: 'value' }
                }
            ]
        },
        {
            suitName: 'when multi line comments present',
            scenario: 'it should remove comments',
            scenarios: [
                {
                    rawContent: '{/* \nsome comment\n*/\n"a": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    rawContent: '{/*\n"b": "value"\n*/\n"a": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    rawContent: '{/* some */"a": "value"}',
                    rawContentInRequestTrigger: '{"a": "value"}',
                    expectedObject: { a: 'value' }
                },
                {
                    rawContent: '{"a":/* some */ "value"}',
                    rawContentInRequestTrigger: '{"a": "value"}',
                    expectedObject: { a: 'value' }
                },
                {
                    rawContent: '{"a": "value"/* some */}',
                    rawContentInRequestTrigger: '{"a": "value"}',
                    expectedObject: { a: 'value' }
                }
            ]
        },
        {
            suitName: 'when quotes with escape character present',
            scenario: 'it should handle it properly',
            /* eslint-disable no-useless-escape */
            scenarios: [
                {
                    rawContent: '{//test\n"a": "val\\\"ue"}',
                    rawContentInRequestTrigger: '{\n"a": "val\\"ue"}',
                    expectedObject: { a: 'val"ue' }
                },
                {
                    rawContent: '{//test\n"a\\\"a": "val\\\"ue"}',
                    rawContentInRequestTrigger: '{\n"a\\"a": "val\\"ue"}',
                    expectedObject: { 'a"a': 'val"ue' }
                }
            ]
        },
        {
            suitName: 'when the json is invalid',
            scenario: 'it should handle it properly',
            scenarios: [
                {
                    rawContent: '{//test\n"a": "value",}',
                    rawContentInRequestTrigger: '{\n"a": "value",}',
                    expectedObject: '{\n"a": "value",}'
                }
            ]
        },
        {
            suitName: 'when content-type header is extension of application/json',
            scenario: 'it should remove comments',
            scenarios: [
                {
                    contentTypeHeader: 'application/json-merge-patch',
                    rawContent: '{//test\n"a": "value",}',
                    rawContentInRequestTrigger: '{\n"a": "value",}',
                    expectedObject: '{\n"a": "value",}'
                }
            ]
        },
        {
            suitName: 'when content-type header is not application/json',
            scenario: 'it should not remove the comments',
            scenarios: [
                {
                    contentTypeHeader: 'text/plain',
                    rawContent: '{//test\n"a": "value",}',
                    rawContentInRequestTrigger: '{//test\n"a": "value",}',
                    expectedObject: '{//test\n"a": "value",}'
                }
            ]
        },
        {
            suitName: 'When the raw body is of type other than string',
            scenario: 'it should make successful request',
            scenarios: [
                {
                    rawContent: { a: 'value' },
                    rawContentInRequestTrigger: { a: 'value' },
                    expectedObject: { a: 'value' }
                }
            ]
        }
    ];


testSuit.forEach((test) => {
    describe(test.suitName, function () {
        let testrun, URL_HEADER;

        before(function () {
            URL_HEADER = global.servers.http + '/echo/post';
        });

        test.scenarios.forEach((scenario, index) => {
            describe(test.scenario, function () {
                before(function (done) {
                    const runOptions = {
                        collection: {
                            item: {
                                request: {
                                    url: URL_HEADER,
                                    method: 'POST',
                                    header: [
                                        {
                                            key: 'Content-Type',
                                            value: scenario.contentTypeHeader || 'application/json'
                                        }
                                    ],
                                    body: {
                                        mode: 'raw',
                                        raw: scenario.rawContent
                                    }
                                }
                            }
                        }
                    };

                    this.run(runOptions, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it(`should complete the run for case: ${index}`, function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true,
                        'response.calledOnce': true
                    });
                });

                it(`should send valid json string in request for case: ${index}`, function () {
                    let response = testrun.response.getCall(0).args[2],
                        responseBody = JSON.parse(response.stream.toString()),
                        contentTypeHeader = scenario.contentTypeHeader || 'application/json';

                    expect(response).to.have.property('code', 200);
                    expect(responseBody).to.have.property('data').that.eql(scenario.expectedObject);
                    expect(responseBody.headers).to.have.property('content-type', contentTypeHeader);
                });

                it(`should return raw body with with comment removed in triggers for case: ${index}`, function () {
                    let request = testrun.request.getCall(0).args[3],
                        rawBody = request.body.raw;

                    expect(rawBody).to.eql(scenario.rawContentInRequestTrigger);
                });
            });
        });
    });
});
