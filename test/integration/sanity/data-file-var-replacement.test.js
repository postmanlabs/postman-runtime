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
                    }, {
                        listen: 'test',
                        script: {
                            exec: [
                                'pm.test("should be ok", function () {',
                                '    pm.response.to.be.success;',
                                '});'
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

    it('must use a consistent format for request.data', function() {
        expect(testrun).be.ok();

        // prerequest script checks
        expect(testrun.prerequest.calledTwice).be.ok();
        expect(testrun.prerequest.getCall(0).args[0]).to.be(null);
        expect(testrun.prerequest.getCall(1).args[0]).to.be(null);
        expect(testrun.prerequest.getCall(0).args[2][0].result.data).to.eql({dataVar: 'value1'});
        expect(testrun.prerequest.getCall(1).args[2][0].result.data).to.eql({dataVar: 'value2'});

        // test script checks
        expect(testrun.test.calledTwice).be.ok();
        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(testrun.test.getCall(1).args[0]).to.be(null);
        expect(testrun.test.getCall(0).args[2][0].result.data).to.eql({dataVar: 'value1'});
        expect(testrun.test.getCall(1).args[2][0].result.data).to.eql({dataVar: 'value2'});
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
