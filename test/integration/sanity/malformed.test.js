describe('malformation', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            environment: {'e': 2},
            globals: {g: 3},
            date: [{key: 'alpha', value: 'beta'}],
            collection: {
                item: [{
                    event: [{listen: 'test', script: {exec: 'tests["200 OK"] = responseCode.code === 200;'}}],
                    request: {
                        url: 'https://postman-echo.com/get?query={{alpha}}&param={{beta}}', // non-active endpoint
                        method: 'GET'
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must handle malformed globals and environments correctly', function () {
        expect(testrun).be.ok();
        var result = _.get(testrun.test.getCall(0).args[2], '0.result', {});

        expect(_.invoke(result, 'globals.values.all')).to.eql([]);
        expect(_.invoke(result, 'environment.values.all')).to.eql([]);
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
