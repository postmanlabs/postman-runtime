describe('sanity test', function () {
    it('must have started and completed the test run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must parse the url after variable resolution', function () {
        var request = testrun.beforeRequest.getCall(0).args[2];

        expect(testrun.beforeRequest.calledOnce).be.ok(); // one request
        expect(request).be.ok();
        expect(request.url.host).to.not.match(/^http:\/\/.*/);
        expect(request.url.toString()).eql('http://httpbin.org/get');
        expect(request.method).be('GET');
    });

    it('must receive response with status code 200 OK', function () {
        var response = testrun.request.getCall(0).args[2];

        expect(testrun.request.calledOnce).be.ok(); // one request
        expect(response.code).to.be(200);
    });
});
