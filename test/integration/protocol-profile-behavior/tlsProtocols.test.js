var fs = require('fs'),
    path = require('path'),
    constants = require('constants'),
    expect = require('chai').expect,
    server = require('../../fixtures/server'),

    forInAsync = function (obj, fn, cb) {
        if (!(obj && fn)) { return; }
        !cb && (cb = function () { /* (ಠ_ಠ) */ });

        var index = 0,
            keys = Object.keys(obj),
            next = function (err) {
                if (err || index >= keys.length) {
                    return cb(err);
                }

                fn.call(obj, keys[index++], next);
            };

        if (!keys.length) {
            return cb();
        }

        next();
    };


describe('protocolProfileBehavior: tls options', function () {
    var testrun,
        servers = {
            // SSLv2 and SSLv3 methods are disabled in Node
            TLSv1: undefined,
            TLSv1_1: undefined,
            TLSv1_2: undefined
        },
        CACertPath = path.resolve(__dirname, '../../fixtures/certificates/ca.pem'),
        requestHandler = function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('okay');
        };

    before(function (done) {
        forInAsync(servers, function (protocol, next) {
            servers[protocol] = server.createSSLServer({
                secureProtocol: protocol + '_method' // The TLS protocol version to use
            });
            servers[protocol].on('/', requestHandler);
            servers[protocol].listen(0, next);
        }, done);
    });

    after(function (done) {
        forInAsync(servers, function (protocol, next) {
            servers[protocol].destroy(next);
        }, done);
    });

    describe('tlsDisabledProtocols', function () {
        describe('TLSv1 server', function () {
            describe('default', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: servers.TLSv1.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should choose TLSv1 protocol by default', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1');
                });
            });

            describe('with TLSv1_1, TLSv1_2 disabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: servers.TLSv1.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['TLSv1_1', 'TLSv1_2']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should get the response correctly', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1');
                });
            });

            describe('with TLSv1 disabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: servers.TLSv1.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['TLSv1']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should throw error for unsupported protocol', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.false;
                    expect(testrun.response.getCall(0).args[0]).to.be.ok;
                });
            });
        });

        describe('TLSv1_1 server', function () {
            describe('default', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: servers.TLSv1_1.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should choose TLSv1.1 protocol by default', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1.1');
                });
            });

            describe('with TLSv1, TLSv1_2 disabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: servers.TLSv1_1.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['TLSv1', 'TLSv1_2']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should get the response correctly', function () {
                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1.1');
                });
            });

            describe('with TLSv1_1 disabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: servers.TLSv1_1.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['TLSv1_1']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should throw error for unsupported protocol', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.false;
                    expect(testrun.response.getCall(0).args[0]).to.be.ok;
                });
            });
        });

        describe('TLSv1_2 server', function () {
            describe('default', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: servers.TLSv1_2.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should choose TLSv1.2 protocol by default', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1.2');
                });
            });

            describe('with TLSv1, TLSv1_1 disabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: servers.TLSv1_2.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['TLSv1', 'TLSv1_1']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should get the response correctly', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1.2');
                });
            });

            describe('with TLSv1_2 disabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: servers.TLSv1_2.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['TLSv1_2']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should throw error for unsupported protocol', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.false;
                    expect(testrun.response.getCall(0).args[0]).to.be.ok;
                });
            });
        });

        describe('TLSv1 & TLSv1_1 server', function () {
            var sslServer;

            before(function (done) {
                sslServer = server.createSSLServer({
                    secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1_2 // Disable SSLv3 and TLSv1_2
                });
                sslServer.on('/', requestHandler);
                sslServer.listen(0, done);
            });

            describe('default', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: sslServer.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should choose TLSv1.1 protocol by default', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1.1');
                });
            });

            describe('with just TLSv1 enabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: sslServer.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['SSLv2', 'SSLv3', 'TLSv1_1', 'TLSv1_2']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should choose TLSv1 protocol correctly', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1');
                });
            });

            describe('with just TLSv1_1 enabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: sslServer.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1_2']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should choose TLSv1.1 protocol correctly', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1.1');
                });
            });

            describe('with just TLSv1_2 enabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: sslServer.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1_1']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should throw error for unsupported protocol', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.false;
                    expect(testrun.response.getCall(0).args[0]).to.be.ok;
                });
            });
        });

        describe('default server', function () {
            var sslServer;

            before(function (done) {
                sslServer = server.createSSLServer();
                sslServer.on('/', requestHandler);
                sslServer.listen(0, done);
            });

            describe('default', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: sslServer.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsCipherSelection: []
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                // @note This will fail when TLSv1.3 will be supported/made default.
                // Refer: https://github.com/nodejs/node/pull/26209
                it('should choose TLSv1.2 protocol by default', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                    var response = testrun.response.getCall(0).args[2],
                        history = testrun.response.getCall(0).args[6],
                        executionData,
                        sessions;

                    expect(history).to.have.property('execution').that.include.property('sessions');
                    sessions = history.execution.sessions;
                    executionData = history.execution.data[0];

                    expect(response.reason()).to.eql('OK');
                    expect(response.text()).to.eql('okay');
                    expect(sessions[executionData.session.id].tls).to.have.property('protocol', 'TLSv1.2');
                });
            });

            describe('with just SSLv23 enabled', function () {
                before(function (done) {
                    this.run({
                        fileResolver: fs,
                        requester: {
                            extendedRootCA: CACertPath,
                            verbose: true
                        },
                        collection: {
                            item: [{
                                request: {
                                    url: sslServer.url,
                                    header: [{
                                        key: 'Connection',
                                        value: 'close'
                                    }]
                                },
                                protocolProfileBehavior: {
                                    tlsDisabledProtocols: ['SSLv2', 'TLSv1', 'TLSv1_1', 'TLSv1_2']
                                }
                            }]
                        }
                    }, function (err, results) {
                        testrun = results;
                        done(err);
                    });
                });

                it('should complete the run', function () {
                    expect(testrun).to.be.ok;
                    expect(testrun).to.nested.include({
                        'done.calledOnce': true,
                        'start.calledOnce': true,
                        'request.calledOnce': true
                    });
                });

                it('should throw error for unsupported protocol', function () {
                    expect(testrun.response.getCall(0).calledWith(null)).to.be.false;
                    expect(testrun.response.getCall(0).args[0]).to.be.ok;
                });
            });
        });
    });

    describe('tlsCipherSelection', function () {
        var sslServer;

        before(function (done) {
            sslServer = server.createSSLServer();
            sslServer.on('/', requestHandler);
            sslServer.listen(0, done);
        });

        after(function (done) {
            sslServer.destroy(done);
        });

        describe('default', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
                    requester: {
                        extendedRootCA: CACertPath,
                        verbose: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: sslServer.url,
                                header: [{key: 'Connection', value: 'close'}]
                            }
                        }],
                        protocolProfileBehavior: {}
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true,
                    'request.calledOnce': true
                });
            });

            // @note Might fail with TLSv1_3 if cipher list oder is changed
            it('should choose ECDHE-RSA-AES128-GCM-SHA256 cipher by default', function () {
                expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                var response = testrun.response.getCall(0).args[2],
                    history = testrun.response.getCall(0).args[6],
                    executionData,
                    sessionData,
                    sessions;

                expect(history).to.have.property('execution').that.include.property('sessions');
                sessions = history.execution.sessions;
                executionData = history.execution.data[0];
                sessionData = sessions[executionData.session.id];

                expect(response.reason()).to.eql('OK');
                expect(response.text()).to.eql('okay');

                expect(sessionData.tls).to.have.property('cipher');
                expect(sessionData.tls.cipher).to.have.property('name', 'ECDHE-RSA-AES128-GCM-SHA256');
            });
        });

        describe('with cipher defined', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
                    requester: {
                        extendedRootCA: CACertPath,
                        verbose: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: sslServer.url,
                                header: [{
                                    key: 'Connection',
                                    value: 'close'
                                }]
                            }
                        }],
                        protocolProfileBehavior: {
                            tlsCipherSelection: ['AES128-SHA']
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true,
                    'request.calledOnce': true
                });
            });

            it('should choose the specified cipher', function () {
                expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                var response = testrun.response.getCall(0).args[2],
                    history = testrun.response.getCall(0).args[6],
                    executionData,
                    sessionData,
                    sessions;

                expect(history).to.have.property('execution').that.include.property('sessions');
                sessions = history.execution.sessions;
                executionData = history.execution.data[0];
                sessionData = sessions[executionData.session.id];

                expect(response.reason()).to.eql('OK');
                expect(response.text()).to.eql('okay');

                expect(sessionData.tls).to.have.property('cipher');
                expect(sessionData.tls.cipher).to.have.property('name', 'AES128-SHA');
            });
        });

        describe('with invalid cipher', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
                    requester: {
                        extendedRootCA: CACertPath,
                        verbose: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: sslServer.url,
                                header: [{
                                    key: 'Connection',
                                    value: 'close'
                                }]
                            }
                        }],
                        protocolProfileBehavior: {
                            tlsCipherSelection: ['RANDOM']
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true,
                    'request.calledOnce': true
                });
            });

            it('should throw error for unsupported protocol', function () {
                expect(testrun.response.getCall(0).calledWith(null)).to.be.false;
                expect(testrun.response.getCall(0).args[0]).to.be.ok;
            });
        });
    });

    describe('tlsPreferServerCiphers', function () {
        var sslServer;

        before(function (done) {
            sslServer = server.createSSLServer({
                ciphers: 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256'
            });
            sslServer.on('/', requestHandler);
            sslServer.listen(0, done);
        });

        after(function (done) {
            sslServer.destroy(done);
        });

        describe('default', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
                    requester: {
                        extendedRootCA: CACertPath,
                        verbose: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: sslServer.url,
                                header: [{
                                    key: 'Connection',
                                    value: 'close'
                                }]
                            }
                        }],
                        protocolProfileBehavior: {}
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true,
                    'request.calledOnce': true
                });
            });

            it('should choose the server specified cipher', function () {
                expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                var response = testrun.response.getCall(0).args[2],
                    history = testrun.response.getCall(0).args[6],
                    executionData,
                    sessionData,
                    sessions;

                expect(history).to.have.property('execution').that.include.property('sessions');
                sessions = history.execution.sessions;
                executionData = history.execution.data[0];
                sessionData = sessions[executionData.session.id];

                expect(response.reason()).to.eql('OK');
                expect(response.text()).to.eql('okay');

                expect(sessionData.tls).to.have.property('cipher');
                expect(sessionData.tls.cipher).to.have.property('name', 'ECDHE-RSA-AES256-GCM-SHA384');
            });
        });

        describe('with tlsPreferServerCiphers: true', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
                    requester: {
                        extendedRootCA: CACertPath,
                        verbose: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: sslServer.url,
                                header: [{
                                    key: 'Connection',
                                    value: 'close'
                                }]
                            }
                        }],
                        protocolProfileBehavior: {
                            tlsPreferServerCiphers: true
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true,
                    'request.calledOnce': true
                });
            });

            it('should choose the server specified cipher', function () {
                expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                var response = testrun.response.getCall(0).args[2],
                    history = testrun.response.getCall(0).args[6],
                    executionData,
                    sessionData,
                    sessions;

                expect(history).to.have.property('execution').that.include.property('sessions');
                sessions = history.execution.sessions;
                executionData = history.execution.data[0];
                sessionData = sessions[executionData.session.id];

                expect(response.reason()).to.eql('OK');
                expect(response.text()).to.eql('okay');

                expect(sessionData.tls).to.have.property('cipher');
                expect(sessionData.tls.cipher).to.have.property('name', 'ECDHE-RSA-AES256-GCM-SHA384');
            });
        });

        describe('with tlsPreferServerCiphers: false', function () {
            before(function (done) {
                this.run({
                    fileResolver: fs,
                    requester: {
                        extendedRootCA: CACertPath,
                        verbose: true
                    },
                    collection: {
                        item: [{
                            request: {
                                url: sslServer.url,
                                header: [{
                                    key: 'Connection',
                                    value: 'close'
                                }]
                            }
                        }],
                        protocolProfileBehavior: {
                            tlsPreferServerCiphers: false,
                            tlsCipherSelection: ['ECDHE-RSA-AES128-GCM-SHA256']
                        }
                    }
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run', function () {
                expect(testrun).to.be.ok;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true,
                    'request.calledOnce': true
                });
            });

            it('should choose the client specified cipher', function () {
                expect(testrun.response.getCall(0).calledWith(null)).to.be.true;

                var response = testrun.response.getCall(0).args[2],
                    history = testrun.response.getCall(0).args[6],
                    executionData,
                    sessionData,
                    sessions;

                expect(history).to.have.property('execution').that.include.property('sessions');
                sessions = history.execution.sessions;
                executionData = history.execution.data[0];
                sessionData = sessions[executionData.session.id];

                expect(response.reason()).to.eql('OK');
                expect(response.text()).to.eql('okay');

                expect(sessionData.tls).to.have.property('cipher');
                expect(sessionData.tls.cipher).to.have.property('name', 'ECDHE-RSA-AES128-GCM-SHA256');
            });
        });
    });
});
