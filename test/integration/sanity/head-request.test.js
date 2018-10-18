var expect = require('chai').expect;

describe('HEAD requests', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: {
                        url: 'http://google.com',
                        method: 'HEAD',
                        body: {
                            mode: 'formdata',
                            formdata: []
                        }
                    }
                }, {
                    request: {
                        url: 'http://github.com',
                        method: 'HEAD',
                        body: {
                            mode: 'formdata',
                            formdata: []
                        }
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have completed the HEAD requests successfully', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'request.calledTwice': true
        });

        expect(testrun.request.getCall(0)).to.nested.include({
            'args[0]': null,
            'args[2].code': 200
        });

        expect(testrun.request.getCall(1)).to.nested.include({
            'args[0]': null,
            'args[2].code': 200
        });
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });
});
