const expect = require('chai').expect,
    dryRun = require('../../../lib/requester/dry-run'),
    Request = require('postman-collection').Request,
    testSuit = [
        {
            suitName: 'with single line comment',
            scenarios: [
                {
                    rawContent: '{// some comment\n"a": "value"\n}',
                    rawContentAfterDryRun: '{\n"a": "value"\n}'
                }
            ]
        },
        {
            suitName: 'with multi line comments',
            scenarios: [
                {
                    rawContent: '{/* \nsome comment\n*/\n"a": "value"\n}',
                    rawContentAfterDryRun: '{\n"a": "value"\n}'
                }
            ]
        },
        {
            suitName: 'with quotes with escape character present',
            /* eslint-disable no-useless-escape */
            scenarios: [
                {
                    rawContent: '{//test\n"a": "val\\\"ue"}',
                    rawContentAfterDryRun: '{\n"a": "val\\"ue"}'
                }
            ]
        },
        {
            suitName: 'with invalid json',
            scenarios: [
                {
                    rawContent: '{//test\n"a": "value",}',
                    rawContentAfterDryRun: '{\n"a": "value",}'
                }
            ]
        },
        {
            suitName: 'with non json raw language',
            scenarios: [
                {
                    language: 'text',
                    rawContent: '{//test\n"a": "value",}',
                    rawContentAfterDryRun: '{//test\n"a": "value",}'
                }
            ]
        },
        {
            suitName: 'with the raw content is not of type string',
            scenarios: [
                {
                    rawContent: { a: 'value' },
                    rawContentAfterDryRun: { a: 'value' }
                }
            ]
        }
    ];


testSuit.forEach((test) => {
    describe('Dry Run Request Body Mode: raw', function () {
        let result;

        test.scenarios.forEach((scenario) => {
            describe(test.suitName, function () {
                before(function (done) {
                    const runOptions = {
                        request: {
                            url: '{{url}}',
                            method: 'POST',
                            header: [],
                            body: {
                                mode: 'raw',
                                raw: scenario.rawContent,
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

                it('should return raw body with with comment removed in returned request', function () {
                    let rawBody = result.body.raw;

                    expect(rawBody).to.eql(scenario.rawContentAfterDryRun);
                });
            });
        });
    });
});
