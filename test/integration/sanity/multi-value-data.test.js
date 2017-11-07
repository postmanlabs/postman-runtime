describe('Multi value data', function() {
    var testrun;

    before(function(done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['var data = request.data;',
                                'tests["working"] = (_.isArray(data.name))']
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'formdata',
                            formdata: [{key: 'name', value: 'abhijit'}, {key: 'name', value: 'kane'}]
                        }
                    }
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function() {
        var assertions = testrun.assertion.getCall(0).args[1];
        expect(testrun).be.ok();
        expect(testrun.test.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(assertions[0]).to.have.property('name', 'working');
        expect(assertions[0]).to.have.property('passed', true);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
