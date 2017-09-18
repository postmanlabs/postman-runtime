var expect = require('expect.js'),
    http = require('http'),
    ntlmUtil = require('httpntlm').ntlm;

describe('NTLM', function () {
    var ntlmServer,
        ntlmServerPort = 3456,
        testrun,
        runOptions = {
            collection: {
                item: {
                    name: 'NTLM Sample Request',
                    request: {
                        url: 'http://localhost:' + ntlmServerPort,
                        auth: {
                            type: 'ntlm',
                            ntlm: {
                                username: '{{uname}}',
                                password: '{{pass}}',
                                domain: '{{domain}}',
                                workstation: '{{workstation}}'
                            }
                        }
                    }
                }
            },
            authorizer: {
                interactive: true
            }
        };

    before(function () {
        var username = 'postman',
            password = 'ntlm',
            domain = 'domain',
            workstation = 'workstation',
            type1message = ntlmUtil.createType1Message({domain: domain, workstation: workstation}),
            // sample taken from a real IIS server
            type2message = 'NTLM TlRMTVNTUAACAAAAHgAeADgAAAAFgoqi3ZUAgGmJcLAAAAAAAAAAAJgAmABWAAAABgOAJQAAAA93AGkAbgAt' +
                'AHMAZQByAHYAZQByAC0AMgAwADEAMgACAB4AdwBpAG4ALQBzAGUAcgB2AGUAcgAtADIAMAAxADIAAQAeAHcAaQBuAC0AcwBlAHIA' +
                'dgBlAHIALQAyADAAMQAyAAQAHgB3AGkAbgAtAHMAZQByAHYAZQByAC0AMgAwADEAMgADAB4AdwBpAG4ALQBzAGUAcgB2AGUAcgAt' +
                'ADIAMAAxADIABwAIAD3f8WFvMNMBAAAAAA==',
            type3message = ntlmUtil.createType3Message(ntlmUtil.parseType2Message(type2message),
                {
                    username: username,
                    password: password,
                    domain: domain,
                    workstation: workstation
                }
            ),
            headers = {
                initialized: {'www-authenticate': 'NTLM'},
                type2message: {'www-authenticate': type2message}
            };

        ntlmServer = new http.Server();
        ntlmServer.on('request', function (req, res) {
            var authHeader = req.headers.authorization,
                header;

            // The last 8 chars always differs, even with same type2message and crendentials.
            // The source code reveals that it's appending randomly generated string.
            if (authHeader && authHeader.slice(0, 160) === type3message.slice(0, 160)) {
                res.writeHead(200);
                return res.end('authorized');
            }

            if (authHeader === type1message) {
                header = headers.type2message;
            }
            else {
                header = headers.initialized;
            }

            res.writeHead(401, header);
            res.end('unauthorized');
        });

        ntlmServer.listen(ntlmServerPort, function () {
            console.log('NTLM server listening on port ' + ntlmServerPort);
        });
    });

    after(function () {
        ntlmServer.close();
    });

    describe('with in-correct details', function () {
        before(function (done) {
            runOptions.environment = {
                values: [{
                    key: 'uname',
                    value: 'foo'
                }, {
                    key: 'pass',
                    value: 'baz'
                }, {
                    key: 'domain',
                    value: 'domain'
                }, {
                    key: 'workstation',
                    value: 'workstation'
                }]
            };
            // perform the collection run
            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent the request thrice', function () {
            expect(testrun.request.callCount).to.be(3);

            var err = testrun.request.firstCall.args[0],
                response = testrun.request.firstCall.args[2];

            expect(err).to.be(null);
            expect(response.code).to.eql(401);
        });
    });

    describe('with correct details', function () {
        before(function (done) {
            runOptions.environment = {
                values: [{
                    key: 'uname',
                    value: 'postman'
                }, {
                    key: 'pass',
                    value: 'password'
                }, {
                    key: 'domain',
                    value: 'domain'
                }, {
                    key: 'workstation',
                    value: 'workstation'
                }]
            };
            // perform the collection run
            this.run(runOptions, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('must have completed the run successfully', function () {
            expect(testrun).be.ok();
            expect(testrun.done.callCount).to.be(1);
            testrun.done.getCall(0).args[0] && console.error(testrun.done.getCall(0).args[0].stack);
            expect(testrun.done.getCall(0).args[0]).to.be(null);
            expect(testrun.start.callCount).to.be(1);
        });

        it('must have sent the request thrice', function () {
            expect(testrun.request.callCount).to.be(3);

            var err = testrun.request.thirdCall.args[0],
                response = testrun.request.thirdCall.args[2];

            expect(err).to.be(null);
            expect(response.code).to.eql(200);
        });
    });

});
