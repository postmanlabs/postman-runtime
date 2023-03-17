const expect = require('chai').expect,
    dryRun = require('../../../lib/requester/dry-run'),
    Request = require('postman-collection').Request,
    testSuit = [
        {
            suitName: 'when single line comment present',
            scenario: 'it should remove comments',
            scenarios: [
                {
                    jsoncString: '{// some comment\n"a": "value"\n}',
                    jsonString: '{\n"a": "value"\n}'
                }
            ]
        },
        {
            suitName: 'when multi line comments present',
            scenario: 'it should remove comments',
            scenarios: [
                {
                    jsoncString: '{/* \nsome comment\n*/\n"a": "value"\n}',
                    jsonString: '{\n"a": "value"\n}'
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
                    jsonString: '{\n"a": "val\\"ue"}'
                }
            ]
        },
        {
            suitName: 'when the json is invalid',
            scenario: 'it should handle it properly',
            scenarios: [
                {
                    jsoncString: '{//test\n"a": "value",}',
                    jsonString: '{\n"a": "value",}'
                }
            ]
        },
        {
            suitName: 'when content-type header is not application/json',
            scenario: 'it should not remove the comments',
            scenarios: [
                {
                    language: 'text',
                    jsoncString: '{//test\n"a": "value",}',
                    jsonString: '{//test\n"a": "value",}'
                }
            ]
        },
        {
            suitName: 'when content-type header is application/json, but disabled by protocolProfileBehavior',
            scenario: 'it should not remove the comments',
            scenarios: [
                {
                    jsoncString: '{//test\n"a": "value",}',
                    jsonString: '{//test\n"a": "value",}',
                    options: { protocolProfileBehavior: { disabledSystemHeaders: { 'Content-Type': true } } }
                }
            ]
        },
        {
            suitName: 'when content-type header is application/json, also present in protocolProfileBehavior,' +
                      'but not disabled',
            scenario: 'it should remove the comments',
            scenarios: [
                {
                    jsoncString: '{//test\n"a": "value",}',
                    jsonString: '{\n"a": "value",}',
                    options: { protocolProfileBehavior: { disabledSystemHeaders: { 'Content-Type': false } } }
                }
            ]
        }
    ];


testSuit.forEach((test) => {
    describe(test.suitName, function () {
        let result;

        test.scenarios.forEach((scenario, index) => {
            describe(test.scenario, function () {
                before(function (done) {
                    const runOptions = {
                        request: {
                            url: '{{url}}',
                            method: 'POST',
                            header: [],
                            body: {
                                mode: 'raw',
                                raw: scenario.jsoncString,
                                options: {
                                    raw: {
                                        language: scenario.language || 'json'
                                    }
                                }
                            }
                        },
                        options: scenario.options || {}
                    };

                    dryRun(new Request(runOptions.request), runOptions.options, function (err, request) {
                        result = request;
                        done(err);
                    });
                });

                it(`should return raw body with with comment removed in triggers for case: ${index}`, function () {
                    let rawBody = result.body.raw;

                    expect(rawBody).to.eql(scenario.jsonString);
                });
            });
        });
    });
});
