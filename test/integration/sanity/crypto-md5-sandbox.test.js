describe('Crypto MD5 sandbox', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: 'tests[\'working\'] = JSON.parse(responseBody).args.a === \'4ce26a583724d5689bf9333af8431483\';'
                        }
                    }, {
                        listen: 'prerequest',
                        script: {
                            exec: 'postman.setGlobalVariable(\'a\', CryptoJS.MD5(\'abhijit\').toString());'
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get?a={{a}}',
                        method: 'GET'
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function () {
        expect(testrun).be.ok();
        expect(testrun.test.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests.working')).to.be(true);
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
