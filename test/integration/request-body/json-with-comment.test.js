const expect = require('chai').expect,
    testSuit = [
        {
            suitName: 'when single line comment present',
            scenario: 'it should remove comments',
            scenarios: [
                {
                    jsoncString: '{// some comment\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    jsoncString: '{\n"a": "value"\n// "b": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    jsoncString: '{// some comment\r\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    jsoncString: '{\n"a": "value"\n// "b": "value"\r\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    jsoncString: '{"a": "value",\n"b": "value" // some comment\n}',
                    expectedObject: { a: 'value', b: 'value' }
                },
                {
                    jsoncString: '{"a": "value",\n"b": "value" // some comment\r\n}',
                    expectedObject: { a: 'value', b: 'value' }
                }
            ]
        },
        {
            suitName: 'when multi line comments present',
            scenario: 'it should remove comments',
            scenarios: [
                {
                    jsoncString: '{/* \nsome comment\n*/\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    jsoncString: '{/*\n"b": "value"\n*/\n"a": "value"\n}',
                    expectedObject: { a: 'value' }
                },
                {
                    jsoncString: '{/* some */"a": "value"}',
                    expectedObject: { a: 'value' }
                },
                {
                    jsoncString: '{"a":/* some */ "value"}',
                    expectedObject: { a: 'value' }
                },
                {
                    jsoncString: '{"a": "value"/* some */}',
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
                    jsoncString: '{//test\n"a": "val\\\"ue"}',
                    expectedObject: { a: 'val"ue' }
                },
                {
                    jsoncString: '{//test\n"a\\\"a": "val\\\"ue"}',
                    expectedObject: { 'a"a': 'val"ue' }
                }
            ]
        },
        {
            suitName: 'when the json is invalid',
            scenario: 'it should handle it properly',
            scenarios: [
                {
                    jsoncString: '{//test\n"a": "value",}',
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
                    jsoncString: '{//test\n"a": "value",}',
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
                    jsoncString: '{//test\n"a": "value",}',
                    expectedObject: '{//test\n"a": "value",}'
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

        test.scenarios.forEach((scenario) => {
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
                                        raw: scenario.jsoncString
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

                it('should return valid json string', function () {
                    var response = testrun.response.getCall(0).args[2],
                        responseBody = JSON.parse(response.stream.toString()),
                        contentTypeHeader = scenario.contentTypeHeader || 'application/json';

                    expect(response).to.have.property('code', 200);
                    expect(responseBody).to.have.property('data').that.eql(scenario.expectedObject);
                    expect(responseBody.headers).to.have.property('content-type', contentTypeHeader);
                });
            });
        });
    });
});
