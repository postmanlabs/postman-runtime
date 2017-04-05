describe('data variable replacement', function() {
    var testrun;

    before(function(done) {
        this.run({
            data: [{dataVar: 'value1'}, {dataVar: 'value2'}],
            collection: {
                item: [{
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'postman.setEnvironmentVariable(\'dataVar2\',iteration);'
                            ]
                        }
                    }],
                    request: {
                        url: 'http://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'formdata',
                            formdata: [
                                {key: 'a', value: '{{dataVar}}', type: 'text'},
                                {key: 'b', value: '{{dataVar2}}', type: 'text'}
                            ]
                        }
                    }
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run two iterations', function() {
        expect(testrun).be.ok();
        expect(testrun.iteration.calledTwice).be.ok();
        expect(testrun.request.calledTwice).be.ok();

        expect(testrun.request.getCall(0).args[0]).to.be(null);
        expect(testrun.request.getCall(1).args[0]).to.be(null);
    });

    it('must have substituted the data variables', function() {
        expect(testrun).be.ok();

        var firstResponse = testrun.request.getCall(0).args[2],
            firstBody = firstResponse.json(),
            secondResponse = testrun.request.getCall(1).args[2],
            secondBody = secondResponse.json();

        expect(firstBody.form).to.have.property('a', 'value1');
        expect(firstBody.form).to.have.property('b', '0');
        expect(secondBody.form).to.have.property('a', 'value2');
        expect(secondBody.form).to.have.property('b', '1');
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
