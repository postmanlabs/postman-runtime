const sdk = require('postman-collection'),
    sinon = require('sinon').createSandbox(),
    requestWrapper = require('../../../lib/requester/request-wrapper');

(typeof window === 'undefined' ? describe : describe.skip)('handling of error with response', function () {
    before(function (done) {
        const fakeRequester = sinon.fake((_request, _requestOptions, onStart, _onData, callback) => {
            const error = new Error('test error'),
                mockResponse = {
                    status: 407,
                    statusMessage: 'Proxy Authentication Required',
                    body: Buffer.from('Proxy Authentication Required - Response Body from Proxy'),
                    headers: [],
                    request: {
                        _debug: [{
                            request: {
                                method: 'GET',
                                href: 'https://postman-echo.com/get',
                                headers: [],
                                httpVersion: '1.1'
                            },
                            response: {
                                downloadedBytes: 100
                            }
                        }]
                    }
                };

            mockResponse.getAllResponseHeaders = () => {
                return mockResponse.headers;
            };

            error.res = mockResponse;

            onStart(error.res); // Calling of onStart via the 'response' event is handled by the postman-request library
            callback(error, null, null, mockResponse.request._debug);
        });

        sinon.stub(requestWrapper, 'request').callsFake(fakeRequester);

        done();
    });

    after(function () {
        sinon.restore();
    });

    it('should handle error with an attached response', function (done) {
        this.run({ collection: { item: { request: 'https://postman-echo.com/get' } } }, function (err, results) {
            if (err) {
                return done(err);
            }

            const testrun = results;

            sinon.assert.calledOnce(testrun.responseStart);
            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledOnce(testrun.done);

            // Even though the callback to runtime returned an error, we handle the response attached to it
            // and don't consider it as a crash.

            let responseStartCalledWith = testrun.responseStart.getCall(0).args,
                responseCalledWith = testrun.response.getCall(0).args,
                doneCalledWith = testrun.done.getCall(0).args;

            expect(responseStartCalledWith[0]).to.be.equal(null); // Not an error
            expect(responseStartCalledWith[2]).to.be.instanceOf(sdk.Response);
            expect(responseStartCalledWith[2].code).to.be.equal(407);

            expect(responseCalledWith[0]).to.be.equal(null); // Not an error
            expect(responseCalledWith[2]).to.be.instanceOf(sdk.Response);
            expect(responseCalledWith[2].text()).to.be.equal('Proxy Authentication Required' +
                ' - Response Body from Proxy');
            expect(responseCalledWith[2].code).to.be.equal(407);

            expect(doneCalledWith[0]).to.be.equal(null); // Not an error

            done();
        });
    });
});
