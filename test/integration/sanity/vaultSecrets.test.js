var expect = require('chai').expect;

describe('vaultSecrets', function () {
    var testrun;

    before(function (done) {
        this.run({
            vaultSecrets: {
                values: [
                    { key: 'vault:var1', value: 'https://postman-echo.com', enabled: true },
                    { key: 'vault:var2', value: 'postman', enabled: true },
                    { key: 'vault:var3', value: 'password', enabled: true }
                ]
            },
            collection: {
                item: {
                    name: 'Vault Secrets Test Request',
                    request: {
                        url: '{{vault:var1}}/basic-auth',
                        method: 'GET',
                        auth: {
                            type: 'basic',
                            basic: [
                                { key: 'username', value: '{{vault:var2}}' },
                                { key: 'password', value: '{{vault:var3}}' }
                            ]
                        }
                    }
                }
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have completed the run', function () {
        expect(testrun).to.be.ok;
        expect(testrun.done.getCall(0).args[0]).to.be.null;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should be resolved in request URL', function () {
        var url = testrun.request.getCall(0).args[3].url.toString(),
            response = testrun.response.getCall(0).args[2];

        expect(url).to.equal('https://postman-echo.com/basic-auth');
        expect(response).to.have.property('code', 200);
    });

    it('should be resolved in request auth', function () {
        var request = testrun.response.getCall(0).args[3],
            response = testrun.response.getCall(0).args[2],
            auth = request.auth.parameters().toObject();

        expect(auth).to.deep.include({
            username: 'postman',
            password: 'password'
        });
        expect(response).to.have.property('code', 200);
    });
});
