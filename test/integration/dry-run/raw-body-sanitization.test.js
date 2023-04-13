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
                    rawContentAfterDryRun: '{\n"a": "value"}'
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
                    rawContentAfterDryRun: '{\n"a": "value"}'
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
                    rawContentAfterDryRun: '{//test\n"a": "value"}'

                },
                {
                    name: 'and content-type header not present',
                    expectToRemoveComments: false,
                    withoutBodyOptions: true,
                    rawContent: '{//test\n"a": "value"}',
                    rawContentAfterDryRun: '{//test\n"a": "value"}'

                }
            ]
        }
    ];


testSuit.forEach((test) => {
    describe('Dry Run Request Body Mode: raw', function () {
        let result;

        test.scenarios.forEach((scenario) => {
            describe(`${test.suitName}${scenario.name ? `, ${scenario.name}` : ''}`, function () {
                before(function (done) {
                    const runOptions = {
                        request: {
                            url: '{{url}}',
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
                        },
                        options: scenario.options || {}
                    };

                    dryRun(new Request(runOptions.request), runOptions.options, function (err, request) {
                        result = request;
                        done(err);
                    });
                });

                it('should return raw body with comment' +
                `${scenario.expectToRemoveComments ? ' removed' : ''}`, function () {
                    let rawBody = result.body.raw;

                    expect(rawBody).to.eql(scenario.rawContentAfterDryRun);
                });
            });
        });
    });
});
