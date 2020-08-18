var expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('Requester Spec: useWhatWGUrlParser', function () {
    var testrun,
        URL = 'https://postman-echo.com/get?q=(%{^*^}%)',
        collection = {
            item: [{
                request: {
                    url: URL,
                    method: 'GET'
                }
            }]
        };

    describe('with useWhatWGUrlParser: undefined', function () {
        before(function (done) {
            this.run({
                collection: collection
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should use Legacy URL encoder by default', function () {
            var response = testrun.response.getCall(0).args[2].json();

            expect(response).to.have.property('url', 'https://postman-echo.com/get?q=%28%25%7B%5E%2A%5E%7D%25%29');
        });
    });

    describe('with useWhatWGUrlParser: false', function () {
        before(function (done) {
            this.run({
                collection: collection,
                requester: {
                    useWhatWGUrlParser: false
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should encode characters in query params', function () {
            var response = testrun.response.getCall(0).args[2].json();

            expect(response).to.have.property('url', 'https://postman-echo.com/get?q=%28%25%7B%5E%2A%5E%7D%25%29');
        });
    });

    describe('with useWhatWGUrlParser: true', function () {
        before(function (done) {
            this.run({
                collection: collection,
                requester: {
                    useWhatWGUrlParser: true
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should not encode characters in query params', function () {
            var response = testrun.response.getCall(0).args[2].json();

            expect(response).to.have.property('url', 'https://postman-echo.com/get?q=(%{^*^}%)');
        });
    });
});
