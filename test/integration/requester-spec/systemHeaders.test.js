var expect = require('chai').expect;

describe('Requester Spec: systemHeaders', function () {
    var testrun;

    describe('sanity', function () {
        before(function (done) {
            this.run({
                requester: {
                    systemHeaders: {'foo': 'Bar'}
                },
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET'
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
            expect(testrun.done.getCall(0).calledWith(null)).to.be.true;
        });

        it('should add the system headers', function () {
            var request = testrun.request.getCall(0).args[3],
                headers = request.headers.filter((header) => {
                    return header.key === 'foo';
                }),
                response = testrun.request.getCall(0).args[2],
                body = response.json();

            expect(headers.length).to.equal(1);
            expect(headers[0].value).to.equal('Bar');
            expect(headers[0].system).to.equal(true);

            expect(body.headers).to.have.property('foo', 'Bar');
        });
    });

    describe('with user defined headers', function () {
        before(function (done) {
            this.run({
                requester: {
                    systemHeaders: {'foo': 'Bar'}
                },
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET',
                            header: [{
                                key: 'foo',
                                value: 'something/else'
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
            expect(testrun.done.getCall(0).calledWith(null)).to.be.true;
        });

        it('should add the system headers instead of user defined headers', function () {
            var request = testrun.request.getCall(0).args[3],
                headers = request.headers.filter((header) => {
                    return header.key === 'foo';
                }),
                response = testrun.request.getCall(0).args[2],
                body = response.json();

            expect(headers.length).to.equal(1);
            expect(headers[0].value).to.equal('Bar');
            expect(headers[0].system).to.equal(true);

            expect(body.headers).to.have.property('foo', 'Bar');
        });
    });

    describe('with disabledSystemHeaders', function () {
        before(function (done) {
            this.run({
                requester: {
                    systemHeaders: {'foo': 'Bar'}
                },
                collection: {
                    item: [{
                        request: {
                            url: 'https://postman-echo.com/get',
                            method: 'GET'
                        },
                        protocolProfileBehavior: {
                            disabledSystemHeaders: {
                                'foo': true
                            }
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
            expect(testrun.done.getCall(0).calledWith(null)).to.be.true;
        });

        it('should add the system headers', function () {
            var request = testrun.request.getCall(0).args[3],
                headers = request.headers.filter((header) => {
                    return header.key === 'foo';
                }),
                response = testrun.request.getCall(0).args[2],
                body = response.json();

            expect(headers.length).to.equal(1);
            expect(headers[0].value).to.equal('Bar');
            expect(headers[0].system).to.equal(true);

            expect(body.headers).to.have.property('foo', 'Bar');
        });
    });

    describe('with pm.sendRequest', function () {
        before(function (done) {
            this.run({
                requester: {
                    systemHeaders: {'foo': 'Bar'}
                },
                collection: {
                    item: [{
                        request: 'https://www.postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                pm.sendRequest('https://postman-echo.com/GET', function (err, res) {
                                    pm.test("Status code is 200", function () {
                                        pm.expect(res).to.have.status(200);
                                    });
                                    pm.test("Has system headers", function () {
                                        pm.expect(pm.request.headers.get('foo')).to.eql('Bar');
                                    });
                                });
                                `
                            }
                        }]
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
                'request.calledTwice': true
            });
        });

        it('should add the system headers to request sent by script', function () {
            var request = testrun.request.getCall(1).args[3],
                headers = request.headers.filter((header) => {
                    return header.key === 'foo';
                }),
                response = testrun.request.getCall(1).args[2],
                body = response.json();

            expect(headers.length).to.equal(1);
            expect(headers[0].value).to.equal('Bar');
            expect(headers[0].system).to.equal(true);

            expect(body.headers).to.have.property('foo', 'Bar');
        });

        it('should successfully run the test script to check system headers', function () {
            expect(testrun).to.nested.include({
                'script.calledOnce': true,
                'test.calledOnce': true,
                'assertion.calledTwice': true
            });
            expect(testrun.script.getCall(0).calledWith(null)).to.be.true;
            expect(testrun.test.getCall(0).calledWith(null)).to.be.true;

            expect(testrun.assertion.getCall(0).args[1][0]).to.include({
                name: 'Status code is 200',
                passed: true
            });

            expect(testrun.assertion.getCall(1).args[1][0]).to.include({
                name: 'Has system headers',
                passed: true
            });
        });
    });
});
