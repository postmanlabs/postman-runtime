const expect = require('chai').expect,
    testSuit = [
        {
            suitName: 'with single line comment',
            scenarios: [
                {
                    name: 'on previous line',
                    expectToRemoveComments: true,
                    rawContent: '{// some comment\n"a": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and commented attribute',
                    expectToRemoveComments: true,
                    rawContent: '{\n"a": "value"\n// "b": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and new line separation using \\r\\n',
                    expectToRemoveComments: true,
                    rawContent: '{// some comment\r\n"a": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and commented attribute with new line separation using \\r\\n',
                    expectToRemoveComments: true,
                    rawContent: '{\n"a": "value"\n// "b": "value"\r\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and comment on next line',
                    expectToRemoveComments: true,
                    rawContent: '{"a": "value",\n"b": "value" // some comment\n}',
                    rawContentInRequestTrigger: '{"a": "value",\n"b": "value" \n}',
                    expectedObject: { a: 'value', b: 'value' }
                },
                {
                    name: 'and comment on next line with new line separation using \r\n',
                    expectToRemoveComments: true,
                    rawContent: '{"a": "value",\n"b": "value" // some comment\r\n}',
                    rawContentInRequestTrigger: '{"a": "value",\n"b": "value" \n}',
                    expectedObject: { a: 'value', b: 'value' }
                }
            ]
        },
        {
            suitName: 'with multi line comments',
            scenarios: [
                {
                    name: 'and previous line',
                    expectToRemoveComments: true,
                    rawContent: '{/* \nsome comment\n*/\n"a": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and commented attribute',
                    expectToRemoveComments: true,
                    rawContent: '{/*\n"b": "value"\n*/\n"a": "value"\n}',
                    rawContentInRequestTrigger: '{\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and comment before attribute',
                    expectToRemoveComments: true,
                    rawContent: '{/* some */"a": "value"}',
                    rawContentInRequestTrigger: '{"a": "value"}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and comment before attribute value',
                    expectToRemoveComments: true,
                    rawContent: '{"a":/* some */ "value"}',
                    rawContentInRequestTrigger: '{"a": "value"}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and comment after attribute value',
                    expectToRemoveComments: true,
                    rawContent: '{"a": "value"/* some */}',
                    rawContentInRequestTrigger: '{"a": "value"}',
                    expectedObject: { a: 'value' }
                }
            ]
        },
        {
            suitName: 'with quotes with escape character',
            /* eslint-disable no-useless-escape */
            scenarios: [
                {
                    name: 'on value',
                    expectToRemoveComments: true,
                    rawContent: '{//test\n"a": "val\\\"ue"}',
                    rawContentInRequestTrigger: '{\n"a": "val\\"ue"}',
                    expectedObject: { a: 'val"ue' }
                },
                {
                    name: 'on key',
                    expectToRemoveComments: true,
                    rawContent: '{//test\n"a\\\"a": "val\\\"ue"}',
                    rawContentInRequestTrigger: '{\n"a\\"a": "val\\"ue"}',
                    expectedObject: { 'a"a': 'val"ue' }
                }
            ]
        },
        {
            suitName: 'with invalid json',
            scenarios: [
                {
                    name: 'and comment present',
                    expectToRemoveComments: true,
                    rawContent: '{//test\n"a": "value",}',
                    rawContentInRequestTrigger: '{\n"a": "value",}',
                    expectedObject: null
                }
            ]
        },
        {
            suitName: 'with raw language is not json',
            scenarios: [
                {
                    name: 'and comment present',
                    expectToRemoveComments: false,
                    language: 'text',
                    rawContent: '{//test\n"a": "value"}',
                    rawContentInRequestTrigger: '{//test\n"a": "value"}',
                    expectedObject: null
                }
            ]
        },
        {
            suitName: 'with the raw body type object',
            scenarios: [
                {
                    expectToRemoveComments: true,
                    rawContent: { a: 'value' },
                    rawContentInRequestTrigger: { a: 'value' },
                    expectedObject: { a: 'value' }
                }
            ]
        },
        {
            suitName: 'with raw language not present',
            scenarios: [
                {
                    name: 'and content-type header is application/json',
                    expectToRemoveComments: true,
                    headers: [
                        {
                            key: 'Content-Type',
                            value: 'application/json'
                        }
                    ],
                    withoutBodyOptions: true,
                    rawContent: '{//test\n"a": "value"}',
                    rawContentInRequestTrigger: '{\n"a": "value"}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and content-type header is application/vnd.api+json',
                    expectToRemoveComments: true,
                    headers: [
                        {
                            key: 'Content-Type',
                            value: 'application/vnd.api+json'
                        }
                    ],
                    withoutBodyOptions: true,
                    rawContent: '{//test\n"a": "value"}',
                    rawContentInRequestTrigger: '{\n"a": "value"}',
                    expectedObject: { a: 'value' }
                },
                {
                    name: 'and content-type header is text/plain',
                    expectToRemoveComments: false,
                    headers: [
                        {
                            key: 'Content-Type',
                            value: 'text/plain'
                        }
                    ],
                    withoutBodyOptions: true,
                    rawContent: '{//test\n"a": "value"}',
                    rawContentInRequestTrigger: '{//test\n"a": "value"}',
                    expectedObject: null
                },
                {
                    name: 'and content-type header not present',
                    expectToRemoveComments: false,
                    withoutBodyOptions: true,
                    rawContent: '{//test\n"a": "value"}',
                    rawContentInRequestTrigger: '{//test\n"a": "value"}',
                    expectedObject: null
                }
            ]
        }
    ];


testSuit.forEach((test) => {
    describe('Request Body Mode: raw', function () {
        let testrun, URL_HEADER;

        before(function () {
            URL_HEADER = global.servers.http + '/echo';
        });

        test.scenarios.forEach((scenario) => {
            describe(`${test.suitName}${scenario.name ? `, ${scenario.name}` : ''}`, function () {
                before(function (done) {
                    const runOptions = {
                        collection: {
                            item: {
                                request: {
                                    url: URL_HEADER,
                                    method: 'POST',
                                    header: scenario.headers || [],
                                    body: {
                                        mode: 'raw',
                                        raw: scenario.rawContent,
                                        ...(!scenario.withoutBodyOptions && {
                                            options: {
                                                raw: {
                                                    language: scenario.language || 'json'
                                                }
                                            }
                                        })
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

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true,
                        'response.calledOnce': true
                    });
                });

                it('should send request, with comments' +
                `${scenario.expectToRemoveComments ? ' removed' : ''}`, function () {
                    let response = testrun.response.getCall(0).args[2],
                        responseBody = JSON.parse(response.stream.toString());

                    expect(response).to.have.property('code', 200);
                    expect(responseBody).to.have.property('json').that.eql(scenario.expectedObject);
                });

                it('should return raw body in request trigger with comments' +
                `${scenario.expectToRemoveComments ? ' removed' : ''}`, function () {
                    let request = testrun.request.getCall(0).args[3],
                        rawBody = request.body.raw;

                    expect(rawBody).to.eql(scenario.rawContentInRequestTrigger);
                });
            });
        });
    });
});
