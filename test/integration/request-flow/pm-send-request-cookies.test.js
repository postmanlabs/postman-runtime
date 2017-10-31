var _ = require('lodash');

describe('cookie sandbox request interaction', function () {
    var cookieUrl = 'https://postman-echo.com/cookies';

    describe('intra-sandbox', function () {
        describe('explicit', function () {
            describe('clear', function () {
                var testrun;

                before(function(done) {
                    this.run({
                        collection: {
                            item: {
                                // ensure that we run something for test and pre-req scripts
                                event: [{
                                    listen: 'prerequest',
                                    script: {
                                        exec: 'pm.cookies.clear();'
                                    }
                                }, {
                                    listen: 'test',
                                    script: {
                                        exec: `
                                        pm.test('should return cookies correctly', function () {
                                            pm.response.to.have.jsonBody({ cookies: {} });
                                            pm.expect(pm.cookies.has('foo')).to.be(false);
                                        });
                                        `
                                    }
                                }],
                                request: {
                                    url: cookieUrl,
                                    header: [{key: 'Cookie', value: 'foo=bar;'}]
                                }
                            }
                        }
                    }, function(err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should have completed the run', function () {
                    expect(testrun).be.ok();
                    expect(testrun.done.calledOnce).be.ok();
                    expect(testrun.done.getCall(0).args[0]).to.be(null);
                    expect(testrun.start.calledOnce).be.ok();
                    expect(testrun.io.calledOnce).to.be(true);
                    expect(testrun.request.calledOnce).to.be(true);
                });

                it('should clear cookies outside the sandbox as well', function () {
                    var reqOne = testrun.request.firstCall.args[3],
                        resOne = testrun.request.firstCall.args[2];

                    expect(reqOne.headers.reference.cookie).to.have.property('value', 'foo=bar;');
                    expect(resOne.json()).to.eql({cookies: {foo: 'bar'}});
                    expect(resOne.cookies.reference).to.be.empty();
                });
            });

            describe('set', function () {
                var testrun;

                before(function(done) {
                    this.run({
                        collection: {
                            item: {
                                // ensure that we run something for test and pre-req scripts
                                event: [{
                                    listen: 'prerequest',
                                    script: {
                                        exec: `
                                        pm.cookies.add({
                                            key: 'foo',
                                            value: 'bar',
                                            domain: '.postman-echo.com'
                                        });
                                        `
                                    }
                                }, {
                                    listen: 'test',
                                    script: {
                                        exec: `
                                        pm.test('should return cookies correctly', function () {
                                            pm.response.to.have.jsonBody({ cookies: { foo: 'bar' } });
                                            pm.expect(pm.cookies.get('foo')).to.be('bar');
                                        });
                                        `
                                    }
                                }],
                                request: cookieUrl
                            }
                        }
                    }, function(err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should have completed the run', function () {
                    expect(testrun).be.ok();
                    expect(testrun.done.calledOnce).be.ok();
                    expect(testrun.done.getCall(0).args[0]).to.be(null);
                    expect(testrun.start.calledOnce).be.ok();
                    expect(testrun.io.calledOnce).to.be(true);
                    expect(testrun.request.calledOnce).to.be(true);
                });

                // @todo: Unskip this when the corresponding behaviour is fixed
                it('should make the set cookies usable outside the sandbox as well', function () {
                    var reqOne = testrun.request.firstCall.args[3],
                        resOne = testrun.request.firstCall.args[2];

                    expect(reqOne.headers.reference).to.not.have.property('cookie');
                    expect(resOne.cookies.reference).to.eql({foo: 'bar'});
                });
            });
        });

        describe('implicit', function () {
            describe('clear', function () {
                var testrun;

                before(function(done) {
                    this.run({
                        collection: {
                            item: {
                                // ensure that we run something for test and pre-req scripts
                                event: [{
                                    listen: 'prerequest',
                                    script: {
                                        exec: `
                                        var sdk = require('postman-collection'),
                                            myreq = new sdk.Request('${cookieUrl}/delete?foo');
        
                                        pm.sendRequest(myreq, function(err, _response) {
                                            pm.test('request was sent from sandbox', function () {
                                                pm.expect(_response).to.have.property('code', 200);
                                                pm.expect(_response).to.have.property('status', 'OK');
                                                pm.expect(_response.json).to.equal({ cookies: {} });
                                                pm.expect(pm.cookies.has('foo')).to.be(false);
                                            });
                                        });
                                        `
                                    }
                                }, {
                                    listen: 'test',
                                    script: {
                                        exec: `
                                        pm.test('should return cookies correctly', function () {
                                            pm.response.to.have.jsonBody({ cookies: {} });
                                            pm.expect(pm.cookies.has('foo')).to.be(false);
                                        });
                                        `
                                    }
                                }],
                                request: {
                                    url: cookieUrl,
                                    header: [{key: 'Cookie', value: 'foo=bar'}]
                                }
                            }
                        }
                    }, function(err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should have completed the run', function () {
                    expect(testrun).be.ok();
                    expect(testrun.done.calledOnce).be.ok();
                    expect(testrun.done.getCall(0).args[0]).to.be(null);
                    expect(testrun.start.calledOnce).be.ok();
                    expect(testrun.io.calledTwice).to.be(true);
                    expect(testrun.request.calledTwice).to.be(true);
                });

                it('should clear the cookies outside the sandbox as well', function () {
                    var reqOne = testrun.io.firstCall.args[4],
                        reqTwo = testrun.request.firstCall.args[3],
                        resOne = testrun.io.firstCall.args[3];

                    expect(reqOne.headers.reference.cookie.value).to.not.contain('foo=bar');
                    expect(reqTwo.headers.reference.cookie.value).to.not.contain('foo=bar');

                    expect(resOne.json()).to.eql({cookies: {}});
                    expect(testrun.request.secondCall.args[2].json()).to.eql({cookies: {foo: 'bar'}});

                    expect(!_.includes(_.get(resOne, 'headers.reference.set-cookie.value', 'foo=bar;'))).to.be(true);
                });
            });

            describe('set', function () {
                var testrun;

                before(function(done) {
                    this.run({
                        collection: {
                            item: {
                                // ensure that we run something for test and pre-req scripts
                                event: [{
                                    listen: 'prerequest',
                                    script: {
                                        exec: `
                                        var sdk = require('postman-collection'),
                                            req = new sdk.Request('${cookieUrl}/set?foo=bar');
        
                                        pm.sendRequest(req, function(err, _response) {
                                            pm.test('request was sent from sandbox', function () {
                                                pm.expect(_response).to.have.property('code', 200);
                                                pm.expect(_response).to.have.property('status', 'OK');
                                                pm.expect(_response.json).to.equal({ cookies: { foo: 'bar' } });
                                                pm.expect(pm.cookies.get('foo')).to.be('bar');
                                            });
                                        });
                                        `
                                    }
                                }, {
                                    listen: 'test',
                                    script: {
                                        exec: `
                                        pm.test('should return cookies correctly', function () {
                                            pm.response.to.have.jsonBody({ cookies: { foo: 'bar' } });
                                            pm.expect(pm.cookies.get('foo')).to.be('bar');
                                        });
                                        `
                                    }
                                }],
                                request: cookieUrl
                            }
                        }
                    }, function(err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should have completed the run', function () {
                    expect(testrun).be.ok();
                    expect(testrun.done.calledOnce).be.ok();
                    expect(testrun.done.getCall(0).args[0]).to.be(null);
                    expect(testrun.start.calledOnce).be.ok();
                    expect(testrun.io.calledTwice).to.be(true);
                    expect(testrun.request.calledTwice).to.be(true);
                });

                it('should expose the cookies outside the sandbox as well', function () {
                    var reqOne = testrun.io.firstCall.args[4],
                        reqTwo = testrun.request.secondCall.args[3],
                        resOne = testrun.io.firstCall.args[3];

                    expect(reqOne.headers.reference.cookie.value).to.contain('foo=bar');
                    expect(reqTwo.headers.reference.cookie.value).to.contain('foo=bar');

                    expect(resOne.json()).to.eql({cookies: {foo: 'bar'}});
                    expect(testrun.request.secondCall.args[2].json()).to.eql({cookies: {foo: 'bar'}});

                    expect(!_.includes(_.get(resOne, 'headers.reference.set-cookie.value', ''), 'foo=bar;')).to
                        .be(true);
                });
            });
        });
    });

    describe('outside sandbox', function () {
        describe('explicit', function () {
            describe('clear', function () {
                var testrun;

                before(function(done) {
                    this.run({
                        collection: {
                            item: {
                                // ensure that we run something for test and pre-req scripts
                                event: [{
                                    listen: 'test',
                                    script: {
                                        exec: `
                                        pm.test('should return cookies correctly', function () {
                                            pm.response.to.have.jsonBody({ cookies: { foo: 'bar' } });
                                            pm.expect(pm.cookies.get('foo')).to.be('bar');
                                        });

                                        pm.cookies.clear();

                                        var sdk = require('postman-collection'),
                                            req = new sdk.Request('${cookieUrl}');

                                        pm.sendRequest(req, function(err, _response) {
                                            pm.test('request was sent from sandbox', function () {
                                                pm.expect(_response).to.have.property('code', 200);
                                                pm.expect(_response).to.have.property('status', 'OK');
                                                pm.expect(_response.json).to.equal({ cookies: {} });
                                                pm.expect(pm.cookies.has('foo')).to.be(false);
                                            });
                                        });
                                        `
                                    }
                                }],
                                request: {
                                    url: cookieUrl,
                                    header: [{key: 'Cookie', value: 'foo=bar'}]
                                }
                            }
                        }
                    }, function(err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should have completed the run', function () {
                    expect(testrun).be.ok();
                    expect(testrun.done.calledOnce).be.ok();
                    expect(testrun.done.getCall(0).args[0]).to.be(null);
                    expect(testrun.start.calledOnce).be.ok();
                    expect(testrun.io.calledTwice).to.be(true);
                    expect(testrun.request.calledTwice).to.be(true);
                });

                it('should clear cookies outside the sandbox as well', function () {
                    var reqOne = testrun.request.firstCall.args[3],
                        reqTwo = testrun.io.secondCall.args[4],
                        resOne = testrun.request.firstCall.args[2],
                        resTwo = testrun.io.secondCall.args[3];

                    expect(reqOne.headers.reference.cookie).to.have.property('value', 'foo=bar');
                    expect(reqTwo.headers.reference.cookie.value).to.not.contain('foo=bar');

                    expect(resOne.headers.reference['set-cookie'].value).to.not.contain('foo=bar');

                    expect(resOne.json()).to.eql({cookies: {foo: 'bar'}});

                    expect(resOne.cookies.reference).to.be.empty();
                    expect(resTwo.cookies.reference).to.be.empty();
                });
            });
        });

        describe('implicit', function () {
            describe('clear', function () {
                var testrun;

                before(function(done) {
                    this.run({
                        collection: {
                            item: {
                                // ensure that we run something for test and pre-req scripts
                                event: [{
                                    listen: 'test',
                                    script: {
                                        exec: `
                                        pm.test('should return cookies correctly', function () {
                                            pm.response.to.have.jsonBody({ cookies: {} });
                                            pm.expect(pm.cookies.has('foo')).to.be('bar');
                                        });

                                        var sdk = require('postman-collection'),
                                            req = new sdk.Request('${cookieUrl}');

                                        pm.sendRequest(req, function (err, _response) {
                                            pm.test('request was sent from sandbox', function () {
                                                pm.expect(_response).to.have.property('code', 200);
                                                pm.expect(_response).to.have.property('status', 'OK');
                                                pm.expect(_response.json).to.equal({ cookies: {} });
                                                pm.expect(pm.cookies.has('foo')).to.be(false);
                                            });
                                        });
                                        `
                                    }
                                }],
                                request: {
                                    url: cookieUrl + '/delete?foo',
                                    header: [{key: 'Cookie', value: 'foo=bar'}]
                                }
                            }
                        }
                    }, function(err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should have completed the run', function () {
                    expect(testrun).be.ok();
                    expect(testrun.done.calledOnce).be.ok();
                    expect(testrun.done.getCall(0).args[0]).to.be(null);
                    expect(testrun.start.calledOnce).be.ok();
                    expect(testrun.io.calledTwice).to.be(true);
                    expect(testrun.request.calledTwice).to.be(true);
                });

                it('should clear cookies outside the sandbox as well', function () {
                    var reqOne = testrun.request.firstCall.args[3],
                        reqTwo = testrun.io.secondCall.args[4],
                        resOne = testrun.request.firstCall.args[2],
                        resTwo = testrun.io.secondCall.args[3];

                    expect(reqOne.headers.reference.cookie.value).to.contain('foo=bar;');
                    expect(reqTwo.headers.reference.cookie.value).to.not.contain('foo=bar');
                    expect(resOne.json()).to.eql({cookies: {foo: 'bar'}});
                    expect(resTwo.json()).to.eql({cookies: {}});

                    expect(!_.includes(_.get(resOne, 'headers.reference.set-cookie.value', '')), 'foo=bar;').to
                        .be(true);

                    expect(resOne.cookies.reference).to.be.empty();
                    expect(resTwo.cookies.reference).to.be.empty();
                });
            });

            describe('set', function () {
                var testrun;

                before(function(done) {
                    this.run({
                        collection: {
                            item: {
                                // ensure that we run something for test and pre-req scripts
                                event: [{
                                    listen: 'test',
                                    script: {
                                        exec: `
                                        pm.test('should return cookies correctly', function () {
                                            pm.response.to.have.jsonBody({ cookies: { foo: 'bar' } });
                                            pm.expect(pm.cookies.get('foo')).to.be('bar');
                                        });

                                        var sdk = require('postman-collection'),
                                            req = new sdk.Request('${cookieUrl}');

                                        pm.sendRequest(req, function (err, _response) {
                                            pm.test('request was sent from sandbox', function () {
                                                pm.expect(_response).to.have.property('code', 200);
                                                pm.expect(_response).to.have.property('status', 'OK');
                                                pm.expect(_response.json).to.equal({ cookies: { foo: 'bar' } });
                                                pm.expect(pm.cookies.get('foo')).to.be('bar');
                                            });
                                        });
                                        `
                                    }
                                }],
                                request: cookieUrl + '/set?foo=bar'
                            }
                        }
                    }, function(err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should have completed the run', function () {
                    expect(testrun).be.ok();
                    expect(testrun.done.calledOnce).be.ok();
                    expect(testrun.done.getCall(0).args[0]).to.be(null);
                    expect(testrun.start.calledOnce).be.ok();
                    expect(testrun.io.calledTwice).to.be(true);
                    expect(testrun.request.calledTwice).to.be(true);
                });

                it('should expose cookies outside the sandbox as well', function () {
                    var reqOne = testrun.request.firstCall.args[3],
                        resOne = testrun.request.firstCall.args[2],
                        reqTwo = testrun.io.secondCall.args[4],
                        resTwo = testrun.io.secondCall.args[3];

                    expect(reqOne.headers.reference.cookie.value).to.contain('foo=bar;');
                    expect(!_.includes(_.get(resOne, 'headers.reference.set-cookie.value', ''), 'foo=bar;')).to
                        .be(true);

                    expect(resOne.json()).to.eql({cookies: {foo: 'bar'}});
                    expect(resTwo.json()).to.eql({cookies: {foo: 'bar'}});

                    expect(reqTwo.headers.reference.cookie.value).to.contain('foo=bar;');
                    expect(!_.includes(_.get(resTwo, 'headers.reference.set-cookie.value', ''), 'foo=bar;')).to
                        .be(true);
                });
            });
        });
    });
});
