describe('Slashed variables', function() {
    var testrun;

    before(function(done) {
        this.run({
            environment: {
                values: [{key: 'fo/o', type: 'text', value: 'alpha', enabled: true},
                    {key: 'b\\ar', type: 'text', value: 'beta', enabled: true}]
            },
            collection: {
                item: [{
                    request: 'https://postman-echo.com/get?foo={{fo/o}}&bar={{b\\ar}}'
                }]
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have sent the request successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.request.calledOnce).be.ok();

        expect(testrun.request.getCall(0).args[0]).to.be(null);
    });

    it('must have resolved the variables', function() {
        var response = testrun.request.getCall(0).args[2],
            query;

        expect(response.code).to.eql(200);

        query = response.json().args;

        expect(query).to.have.property('foo', 'alpha');
        expect(query).to.have.property('bar', 'beta');
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
