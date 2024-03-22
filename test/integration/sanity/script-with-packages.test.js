var expect = require('chai').expect,
    sinon = require('sinon');

describe('Scripts with packages', function () {
    var _ = require('lodash'),
        packageResolverStub = sinon.stub().callsFake(function ({ packages }, callback) {
            const resolvedPackages = Object.keys(packages).reduce(function (acc, pkg) {
                acc[pkg] = {
                    data: `module.exports.name = "${pkg}"`
                };

                return acc;
            }, {});

            callback(null, resolvedPackages);
        }),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'prerequest',
                        script: {
                            exec: [
                                'const pkg1 = pm.require("pkg1");'
                            ],
                            packages: {
                                pkg1: {
                                    id: 'pkg1-id'
                                }
                            }
                        }
                    }, {
                        listen: 'test',
                        script: {
                            exec: [
                                'const pkg2 = pm.require("pkg2");'
                            ],
                            packages: {
                                pkg1: {
                                    id: 'pkg1-id'
                                },
                                pkg2: {
                                    id: 'pkg2-id'
                                }
                            }
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/get',
                        method: 'GET'
                    }
                }]
            },
            script: {
                packageResolver: packageResolverStub
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should call packageResolver before each event', function () {
        expect(packageResolverStub.callCount).to.equal(2);
    });

    it('should call packageResolver with packages for prerequest script', function () {
        var preReqErr = _.get(testrun.prerequest.getCall(0).args[2], '0.error');

        expect(preReqErr).to.be.undefined;
        expect(packageResolverStub.firstCall.args[0]).to.have.property('packages');
        expect(packageResolverStub.firstCall.args[0].packages).to.eql({
            pkg1: {
                id: 'pkg1-id'
            }
        });
    });

    it('should call packageResolver with packages for tests script', function () {
        var testErr = _.get(testrun.test.getCall(0).args[2], '0.error');

        expect(testErr).to.be.undefined;
        expect(packageResolverStub.secondCall.args[0]).to.have.property('packages');
        expect(packageResolverStub.secondCall.args[0].packages).to.eql({
            pkg1: {
                id: 'pkg1-id'
            },
            pkg2: {
                id: 'pkg2-id'
            }
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
});
