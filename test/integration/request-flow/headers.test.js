var _ = require('lodash'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    Header = require('postman-collection').Header,
    server = require('../../fixtures/server');

describe('request headers', function () {
    var httpServer,
        testrun,
        PORT = 5050,
        HOST = 'http://localhost:' + PORT;

    /**
     * Converts raw request headers to array of key-value object.
     *
     * [ 'User-Agent', 'PostmanRuntime' ] -> [{key: 'User-Agent', value: 'PostmanRuntime'}]
     *
     * @param {String[]} rawHeaders - raw request headers
     * @returns {Object[]}
     */
    function parseRawHeaders (rawHeaders) {
        return _(rawHeaders).chunk(2).map(([key, value]) => {
            return {key, value};
        }).value();
    }

    before(function (done) {
        httpServer = server.createHTTPServer();

        httpServer.on('/', function (req, res) {
            res.writeHead(200, {'content-type': 'application/json'});
            res.end(JSON.stringify(parseRawHeaders(req.rawHeaders)));
        });

        httpServer.listen(PORT, function (err) {
            if (err) { return done(err); }

            this.run({
                collection: {
                    item: [{
                        name: 'Duplicate headers',
                        request: {
                            url: HOST,
                            header: [{
                                key: 'Header-Name',
                                value: 'value1'
                            }, {
                                key: 'Header-Name',
                                value: 'value2'
                            }]
                        }
                    }, {
                        name: 'Disabled & Falsy headers',
                        request: {
                            url: HOST,
                            header: [{
                                key: 'Header-Name-1',
                                value: 'value1'
                            }, {
                                key: 'Header-Name-2',
                                value: 'value2',
                                disabled: true
                            }, {
                                key: '',
                                value: 'value3'
                            }]
                        }
                    }, {
                        name: 'Case Insensitive',
                        request: {
                            url: HOST,
                            header: [{
                                key: 'Header-Name-0',
                                value: 'value0'
                            }, {
                                key: 'Header-Name-1',
                                value: 'value1'
                            }, {
                                key: 'header-name-1',
                                value: 'value2'
                            }, {
                                key: 'HEADER-NAME-2',
                                value: 'value3'
                            }]
                        }
                    }, {
                        name: 'System headers',
                        request: {
                            url: HOST,
                            header: [{
                                key: 'Header-Name-0',
                                value: 'value0'
                            }, {
                                key: 'User-Agent',
                                value: 'PostmanRuntime/test'
                            }, {
                                key: 'Postman-Token',
                                value: 'someCustomToken'
                            }, {
                                key: 'referer',
                                value: HOST
                            }]
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        }.bind(this));
    });

    after(function (done) {
        httpServer.destroy(done);
    });

    it('should complete the run', function () {
        expect(testrun).to.be.ok;
        sinon.assert.calledOnce(testrun.start);
        sinon.assert.calledOnce(testrun.done);
        sinon.assert.calledWith(testrun.done.getCall(0), null);

        sinon.assert.callCount(testrun.request, 4);
        sinon.assert.callCount(testrun.response, 4);
    });

    it('should handle duplicate headers correctly', function () {
        sinon.assert.calledWith(testrun.request.getCall(0), null);
        sinon.assert.calledWith(testrun.response.getCall(0), null);

        var response = testrun.response.getCall(0).args[2],
            requestHeaders = JSON.parse(response.stream);

        expect(requestHeaders).to.deep.include.members([
            {key: 'Header-Name', value: 'value1'},
            {key: 'Header-Name', value: 'value2'}
        ]);
    });

    it('should handle disabled and falsy header keys correctly', function () {
        sinon.assert.calledWith(testrun.request.getCall(1), null);
        sinon.assert.calledWith(testrun.response.getCall(1), null);

        var response = testrun.response.getCall(1).args[2],
            requestHeaders = JSON.parse(response.stream),
            headerKeys = requestHeaders.map(function (header) { return header.key; });

        expect(requestHeaders).to.deep.include({
            key: 'Header-Name-1',
            value: 'value1'
        });

        expect(headerKeys).to.not.include('Header-Name-2');
        expect(headerKeys).to.not.include('');
    });

    it('should handle headers with different cases correctly', function () {
        sinon.assert.calledWith(testrun.request.getCall(2), null);
        sinon.assert.calledWith(testrun.response.getCall(2), null);

        var response = testrun.response.getCall(2).args[2],
            requestHeaders = JSON.parse(response.stream);

        expect(requestHeaders).to.deep.include.members([
            {key: 'Header-Name-0', value: 'value0'},
            {key: 'header-name-1', value: 'value2'},
            {key: 'HEADER-NAME-2', value: 'value3'}
        ]);

        // @todo: handle multiple headers with different capitalization
        // https://github.com/postmanlabs/postman-app-support/issues/5372
        expect(requestHeaders).to.not.deep.include({
            key: 'Header-Name-1',
            value: 'value1'
        });
    });

    it('should handle system headers correctly', function () {
        sinon.assert.calledWith(testrun.request.getCall(3), null);
        sinon.assert.calledWith(testrun.response.getCall(3), null);

        var request = testrun.response.getCall(3).args[3],
            response = testrun.response.getCall(3).args[2],
            requestHeaders = JSON.parse(response.stream);

        // @note this will fail on updating system headers to track those changes
        expect(requestHeaders).to.have.deep.members([
            {key: 'Header-Name-0', value: 'value0'},
            {key: 'User-Agent', value: 'PostmanRuntime/test'},
            {key: 'Postman-Token', value: 'someCustomToken'},
            {key: 'referer', value: HOST},
            {key: 'Accept', value: '*/*'},
            {key: 'Cache-Control', value: 'no-cache'},
            {key: 'Host', value: 'localhost:5050'},
            {key: 'accept-encoding', value: 'gzip, deflate'},
            {key: 'Connection', value: 'keep-alive'}
        ]);

        // system headers should be added correctly
        expect(request.headers.members).to.have.deep.members([
            // user-defined headers
            new Header({key: 'Header-Name-0', value: 'value0'}),
            // user-defined, not overwritten by system
            new Header({key: 'User-Agent', value: 'PostmanRuntime/test'}),
            new Header({key: 'Postman-Token', value: 'someCustomToken'}),
            // requester header(overwritten) not added as system if value is unchanged
            new Header({key: 'referer', value: HOST}),
            // system headers
            new Header({key: 'Accept', value: '*/*', system: true}),
            new Header({key: 'Cache-Control', value: 'no-cache', system: true}),
            new Header({key: 'Host', value: 'localhost:5050', system: true}),
            new Header({key: 'accept-encoding', value: 'gzip, deflate', system: true}),
            new Header({key: 'Connection', value: 'keep-alive', system: true})
        ]);

        // @note currently, only `Connection` header is added by NodeJS which
        // is handled by the requester. This test will fail if any other
        // header will be added by NodeJS.
        expect(request.headers.count()).to.equal(requestHeaders.length);
    });
});
