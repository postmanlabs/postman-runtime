/* global describe, it */
var expect = require('expect.js'),
    Runner = require('../../lib/runner/'),
    sdk = require('postman-collection');

describe('runner', function () {
    describe('Run', function () {
        it('must be a constructor', function () {
            expect(function () {
                return new Runner();
            }).withArgs().to.not.throwError();
        });

        it('must expose the run method', function () {
            var runner = new Runner();
            expect(runner.run).to.be.a('function');
        });

        describe('.run', function () {
            var collection = new sdk.Collection({
                item: [{
                    id: 'F2', // This is intended, so that id vs name match precedence can be tested
                    name: 'F1',
                    item: [{
                        name: 'F1.R1',
                        request: 'https://postman-echo.com/get'
                    }]
                }, {
                    name: 'F2',
                    item: [{
                        name: 'F1.R2',
                        request: 'https://postman-echo.com/get'
                    }]
                }]
            });

            describe('invalid entrypoint', function () {
                it('must bail out if options.abortOnError is set', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {
                        entrypoint: 'random',
                        abortOnError: true
                    }, function (err, run) {
                        expect(err.message).to.be('Unable to find a folder or request: random');
                        expect(run).to.not.be.ok();

                        done();
                    });
                });

                it('must NOT bail out if options.abortOnError is not set', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {
                        entrypoint: 'random'
                    }, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.start).to.be.a('function');
                        done();
                    });
                });
            });

            describe('malformed collections', function () {
                it('should handle invalid collections correctly', function (done) {
                    var runner = new Runner();

                    runner.run('random', {}, function (err, run) {
                        expect(err).to.be(null);
                        expect(run).to.be.ok();
                        expect(run.state.items).to.eql([]);

                        done();
                    });
                });
            });

            describe('edge cases', function () {
                it('should handle malformed run options correctly', function (done) {
                    var runner = new Runner();

                    runner.run(collection, 'random', function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.start).to.be.a('function');
                        done();
                    });
                });

                it('should override prototype globals with those passed from the run options', function (done) {
                    var runner = new Runner({
                        globals: new sdk.VariableScope({}, [{key: 'alpha', value: 'foo'}])
                    });

                    runner.run(collection, {
                        globals: new sdk.VariableScope({}, [{key: 'beta', value: 'bar'}])
                    }, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.start).to.be.a('function');
                        done();
                    });
                });
            });

            describe('options parameter', function () {
                var runnerTimeout = 400,
                    runTimeout = 500,
                    defaultGlobalTimeout = 3 * 60 * 1000; // 3 minutes

                it('should handle timeout in runner options', function (done) {
                    var runner = new Runner({
                        run: {
                            timeout: {
                                global: runnerTimeout,
                                script: runnerTimeout
                            }
                        }
                    });

                    runner.run(collection, {}, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.options.timeout.global).to.be(runnerTimeout);
                        expect(run.options.timeout.script).to.be(runnerTimeout);
                        expect(run.options.timeout.request).to.be(Infinity);
                        done();
                    });
                });

                it('should handle timeout in run options', function (done) {
                    var runner = new Runner({});

                    runner.run(collection, {
                        timeout: {
                            global: runTimeout,
                            script: runTimeout
                        }
                    }, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.options.timeout.global).to.be(runTimeout);
                        expect(run.options.timeout.script).to.be(runTimeout);
                        expect(run.options.timeout.request).to.be(Infinity);
                        done();
                    });
                });

                it('should give more precedence to runner options', function (done) {
                    var runner = new Runner({
                        run: {
                            timeout: {
                                global: runnerTimeout,
                                request: runnerTimeout,
                                script: runnerTimeout
                            }
                        }
                    });

                    runner.run(collection, {
                        timeout: {
                            global: runTimeout,
                            request: runTimeout,
                            script: runTimeout
                        }
                    }, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.options.timeout.global).to.be(runnerTimeout);
                        expect(run.options.timeout.script).to.be(runnerTimeout);
                        expect(run.options.timeout.request).to.be(runnerTimeout);
                        done();
                    });
                });

                it('should have proper defaults for timeout', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {}, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.options.timeout.global).to.be(defaultGlobalTimeout);
                        expect(run.options.timeout.script).to.be(Infinity);
                        expect(run.options.timeout.request).to.be(Infinity);
                        done();
                    });
                });

                it('should set default timeouts for null/undefined timeout values', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {
                        timeout: {
                            global: null,
                            script: null,
                            request: undefined
                        }
                    }, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.options.timeout.global).to.be(defaultGlobalTimeout);
                        expect(run.options.timeout.script).to.be(Infinity);
                        expect(run.options.timeout.request).to.be(Infinity);
                        done();
                    });
                });

                it('should normalize 0 timeouts to infinity', function (done) {
                    var runner = new Runner({
                        run: {
                            timeout: {global: 0}
                        }
                    });

                    runner.run(collection, {}, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.options.timeout.global).to.be(Infinity);
                        done();
                    });
                });

                it('should normalize negative values to Infinity', function (done) {
                    var runner = new Runner({
                        run: {
                            timeout: {global: -1}
                        }
                    });

                    runner.run(collection, {}, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.options.timeout.global).to.be(Infinity);
                        done();
                    });
                });

                it('should normalize Infinty values to default', function (done) {
                    var runner = new Runner({
                        run: {
                            timeout: {global: Infinity}
                        }
                    });

                    runner.run(collection, {}, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.options.timeout.global).to.be(defaultGlobalTimeout);
                        done();
                    });
                });

                it('should preserve finite timeouts', function (done) {
                    var runner = new Runner({
                        run: {
                            timeout: {global: 100, script: 120, request: 180000}
                        }
                    });

                    runner.run(collection, {}, function (err, run) {
                        expect(err).to.not.be.ok();

                        expect(run).to.be.ok();
                        expect(run.options.timeout.global).to.be(100);
                        expect(run.options.timeout.script).to.be(120);
                        expect(run.options.timeout.request).to.be(180000);
                        done();
                    });
                });
            });
        });
    });

    describe('normaliseIterationData', function () {
        it('should handle insane arguments correctly', function () {
            expect(Runner.normaliseIterationData()).to.eql([{}]);
        });

        it('should trim the provided data set to the specified length', function () {
            expect(Runner.normaliseIterationData([{foo: 'alpha'}, {bar: 'beta'}], 1)).to.eql([{foo: 'alpha'}]);
        });

        it('should duplicate the last element of the data set if length is greater', function () {
            expect(Runner.normaliseIterationData([{foo: 'alpha'}], 2)).to.eql([{foo: 'alpha'}, {foo: 'alpha'}]);
        });
    });
});
