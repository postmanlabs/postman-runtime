describe('Collection Variables', function() {
    var testrun;

    before(function(done) {
        this.run({
            globals: {
                values: [
                    {key: 'global-var', value: 'global var value', name: 'global-var', enabled: true},
                    {key: 'user', value: 'incorrect username', name: 'user', enabled: true}
                ]
            },
            environment: {
                values: [
                    {key: 'env-var', value: 'env var value', name: 'env-var', enabled: true},
                    {key: 'pass', value: 'password', name: 'pass', enabled: true}
                ]
            },
            collection: {
                variable: [
                    {key: 'user', value: 'postman', enabled: true},
                    {key: 'pass', value: 'incorrect password', enabled: true},
                    {key: 'echo-url', value: 'https://postman-echo.com', enabled: true}
                ],
                item: {
                    name: 'Collection Variables Test Request',
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['console.log("test", pm.variables.toObject())']
                        }
                    }, {
                        listen: 'prerequest',
                        script: {
                            exec: ['console.log("test", pm.variables.toObject())']
                        }
                    }],
                    request: {
                        url: '{{echo-url}}/basic-auth',
                        method: 'GET',
                        auth: {
                            type: 'basic',
                            basic: [
                                {key: 'username', value: '{{user}}'},
                                {key: 'password', value: '{{pass}}'}
                            ]
                        }
                    }
                }
            }
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.test.calledOnce).be.ok();
        expect(testrun.test.getCall(0).args[0]).to.be(null);
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must be resolved in request URL', function() {
        var url = testrun.request.getCall(0).args[3].url.toString();

        expect(url).to.be('https://postman-echo.com/basic-auth');
    });

    it('must be resolved in request auth', function() {
        var request = testrun.response.getCall(0).args[3],
            response = testrun.response.getCall(0).args[2],
            auth = request.auth.parameters().toObject();

        expect(auth).to.have.property('username', 'postman');
        expect(auth).to.have.property('password', 'password');
        expect(response.code).to.be(200);
    });

    it('must be resolved in test and prerequest scripts', function() {
        var testConsoleArgs = testrun.console.getCall(1).args.slice(2),
            prConsoleArgs = testrun.console.getCall(0).args.slice(2),
            variables = {
                'global-var': 'global var value',
                'env-var': 'env var value',
                'echo-url': 'https://postman-echo.com',
                'user': 'postman',
                'pass': 'password'
            };

        expect(prConsoleArgs[0]).to.be('test');
        expect(prConsoleArgs[1]).to.eql(variables);
        expect(testConsoleArgs[0]).to.be('test');
        expect(testConsoleArgs[1]).to.eql(variables);
    });
});
