var expect = require('chai').expect,
    sinon = require('sinon'),
    teleportJS = require('teleport-javascript');

describe('Console', function () {
    describe('with default options', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                    console.log({
                                        regex: /a-z/g,
                                        nil: null,
                                        undef: undefined,
                                        string: 'some str',
                                        number: 1234,
                                        boolean: true,
                                        arr: [1, 2, 3],
                                        obj: {
                                            a: 1,
                                            b: 2
                                        },
                                        map: new Map([[1, 'one'], [2, 'two']]),
                                        set: new Set([1, 2, 3])
                                    }, /a-z/g);
                                    console.info(Infinity);
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
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should run the test script successfully', function () {
            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.script.getCall(0), null);
        });

        it('should not mutate any data-types', function () {
            sinon.assert.calledTwice(testrun.console);

            var expectedResult = {
                    regex: /a-z/g,
                    nil: null,
                    undef: undefined,
                    string: 'some str',
                    number: 1234,
                    boolean: true,
                    arr: [1, 2, 3],
                    obj: {
                        a: 1,
                        b: 2
                    },
                    map: new Map([[1, 'one'], [2, 'two']]),
                    set: new Set([1, 2, 3])
                },
                args0 = testrun.console.getCall(0).args,
                args1 = testrun.console.getCall(1).args;

            expect(args0[0]).to.be.an('object');
            expect(args0[1]).to.equal('log');
            expect(args0[2]).to.eql(expectedResult);
            expect(args0[3]).to.eql(/a-z/g);

            expect(args1[0]).to.be.an('object');
            expect(args1[1]).to.equal('info');
            expect(args1[2]).to.eql(Infinity);
        });
    });

    describe('with serializeLogs true', function () {
        var testrun;

        before(function (done) {
            this.run({
                script: {
                    serializeLogs: true
                },
                collection: {
                    item: [{
                        request: 'https://postman-echo.com/get',
                        event: [{
                            listen: 'test',
                            script: {
                                type: 'text/javascript',
                                exec: `
                                    console.log({
                                        undef: undefined,
                                        map: new Map([['s', new Set([1, /a-z/g, -Infinity])], ['n', 123]])
                                    }, undefined);
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
            sinon.assert.calledOnce(testrun.start);
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);

            sinon.assert.calledOnce(testrun.request);
            sinon.assert.calledWith(testrun.request.getCall(0), null);

            sinon.assert.calledOnce(testrun.response);
            sinon.assert.calledWith(testrun.response.getCall(0), null);
        });

        it('should run the test script successfully', function () {
            sinon.assert.calledOnce(testrun.script);
            sinon.assert.calledWith(testrun.script.getCall(0), null);

            sinon.assert.calledOnce(testrun.test);
            sinon.assert.calledWith(testrun.script.getCall(0), null);
        });

        it('should not mutate any data-types', function () {
            sinon.assert.calledOnce(testrun.console);

            var logData = [{
                    undef: undefined,
                    map: new Map([['s', new Set([1, /a-z/g, -Infinity])], ['n', 123]])
                }, undefined],
                args = testrun.console.getCall(0).args,
                expectedResult = teleportJS.stringify(logData);

            expect(args[0]).to.be.an('object');
            expect(args[1]).to.equal('log');
            expect(args[2], 'serialized logs').to.equal(expectedResult);
            expect(teleportJS.parse(expectedResult)).to.eql(logData);
        });
    });
});
