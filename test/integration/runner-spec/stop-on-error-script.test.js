var expect = require('chai').expect;

describe('Stop on error', function () {
    describe('Async script', function () {
        var testrun;

        before(function (done) {
            this.run({
                stopOnError: true,
                collection: {
                    item: [{
                        event: [{
                            listen: 'prerequest',
                            script: {exec: [
                                'setTimeout(function () {',
                                '    console.log(foo);', // deliberate reference error
                                '}, 100);'
                            ]}
                        }],
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET'
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
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

        it('should gracefully stop the run on errors', function () {
            expect(testrun).to.nested.include({
                'script.calledOnce': true,
                'item.calledOnce': true,
                'iteration.calledOnce': true
            });

            expect(testrun.script.getCall(0).args[0]).to.have.property('message', 'foo is not defined');
        });

        it('should not send the request', function () {
            expect(testrun.request.called).to.be.false;
        });
    });
});
