var expect = require('chai').expect;

describe('sanity test', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                variables: [],
                info: {
                    name: 'multi-level-folders-v2',
                    _postman_id: 'e5f2e9cf-173b-c60a-7336-ac804a87d762',
                    description: 'A simple V2 collection to test out multi level folder flows',
                    schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
                },
                item: [{
                    name: 'F1',
                    item: [{
                        name: 'F1.R1',
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET',
                            header: [],
                            body: {}
                        },
                        response: []
                    }, {
                        name: 'F1.R2',
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET',
                            header: [],
                            body: {}
                        },
                        response: []
                    }, {
                        name: 'F1.R3',
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET',
                            header: [],
                            body: {}
                        },
                        response: []
                    }]
                }, {
                    name: 'F2',
                    item: [{
                        name: 'F2.F3',
                        item: [{
                            name: 'F2.F3.R1',
                            request: {
                                url: 'https://postman-echo.com/get',
                                method: 'GET',
                                header: [],
                                body: {}
                            },
                            response: []
                        }]
                    }, {
                        name: 'F4', item: []
                    }, {
                        name: 'F2.R1',
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET',
                            header: [],
                            body: {}
                        },
                        response: []
                    }]
                }, {
                    name: 'R1',
                    request: {
                        url: 'https://postman-echo.com/get',
                        method: 'GET',
                        header: [],
                        body: {}
                    },
                    response: []
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have started and completed the test run', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should must run all requests in the correct order', function () {
        var expectedOrder = ['F1.R1', 'F1.R2', 'F1.R3', 'F2.F3.R1', 'F2.R1', 'R1'];

        expectedOrder.forEach(function (expectedName, index) {
            var request = testrun.item.getCall(index).args[2];

            expect(request).to.be.ok;
            expect(request).to.deep.include({
                name: expectedName
            });
        });
    });
});
