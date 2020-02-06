var expect = require('chai').expect,
    Runner = require('../../lib/runner/'),
    sdk = require('postman-collection');

describe('runner', function () {
    describe('Run', function () {
        it('should be a constructor', function () {
            expect(function () {
                return new Runner();
            }).to.not.throw();
        });

        it('should expose the run method', function () {
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
                it('should bail out if options.abortOnError is set with entrypoint as string', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {
                        entrypoint: {execute: 'random'},
                        abortOnError: true
                    }, function (err, run) {
                        expect(err.message).to.equal('Unable to find a folder or request: random');
                        expect(run).to.be.undefined;

                        done();
                    });
                });

                it('should bail out if options.abortOnError is set with entrypoint as object', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {
                        entrypoint: {execute: 'random'},
                        abortOnError: true
                    }, function (err, run) {
                        expect(err.message).to.equal('Unable to find a folder or request: random');
                        expect(run).to.be.undefined;

                        done();
                    });
                });

                it('should NOT bail out if options.abortOnError is not set', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {
                        entrypoint: 'random'
                    }, function (err, run) {
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
                        expect(run.start).to.be.a('function');
                        done();
                    });
                });
            });

            describe('malformed collections', function () {
                it('should handle invalid collections correctly', function (done) {
                    var runner = new Runner();

                    runner.run('random', {}, function (err, run) {
                        expect(err).to.be.null;
                        expect(run).to.be.ok;
                        expect(run).to.deep.nested.include({
                            'state.items': []
                        });

                        done();
                    });
                });
            });

            describe('edge cases', function () {
                it('should handle malformed run options correctly', function (done) {
                    var runner = new Runner();

                    runner.run(collection, 'random', function (err, run) {
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
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
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
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
                        expect(err).to.null;

                        expect(run).to.be.ok;
                        expect(run).to.have.property('options').that.nested.include({
                            'timeout.global': runnerTimeout,
                            'timeout.script': runnerTimeout,
                            'timeout.request': Infinity
                        });
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
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
                        expect(run).to.have.property('options').that.nested.include({
                            'timeout.global': runTimeout,
                            'timeout.script': runTimeout,
                            'timeout.request': Infinity
                        });
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
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
                        expect(run).to.have.property('options').that.nested.include({
                            'timeout.global': runnerTimeout,
                            'timeout.script': runnerTimeout,
                            'timeout.request': runnerTimeout
                        });
                        done();
                    });
                });

                it('should have proper defaults for timeout', function (done) {
                    var runner = new Runner();

                    runner.run(collection, {}, function (err, run) {
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
                        expect(run).to.have.property('options').that.nested.include({
                            'timeout.global': defaultGlobalTimeout,
                            'timeout.script': Infinity,
                            'timeout.request': Infinity
                        });
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
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
                        expect(run).to.have.property('options').that.nested.include({
                            'timeout.global': defaultGlobalTimeout,
                            'timeout.script': Infinity,
                            'timeout.request': Infinity
                        });
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
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
                        expect(run).to.have.property('options').that.nested.include({
                            'timeout.global': Infinity
                        });
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
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
                        expect(run).to.have.property('options').that.nested.include({
                            'timeout.global': Infinity
                        });
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
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
                        expect(run).to.have.property('options').that.nested.include({
                            'timeout.global': defaultGlobalTimeout
                        });
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
                        expect(err).to.be.null;

                        expect(run).to.be.ok;
                        expect(run).to.have.property('options').that.nested.include({
                            'timeout.global': 100,
                            'timeout.script': 120,
                            'timeout.request': 180000
                        });
                        done();
                    });
                });
            });

            describe('option iterationCount', function () {
                describe('when set', function () {
                    it('should be present in options', function (done) {
                        var runner = new Runner();

                        runner.run(collection, {iterationCount: 10}, function (err, run) {
                            expect(err).to.be.null;
                            expect(run).to.nested.include({
                                'options.iterationCount': 10
                            });
                            done();
                        });
                    });

                    it('should not fail to create run for large iterationCount', function (done) {
                        var runner = new Runner();

                        runner.run(collection, {iterationCount: 99999999}, function (err, run) {
                            expect(err).to.be.null;
                            expect(run).to.nested.include({
                                'options.iterationCount': 99999999
                            });
                            done();
                        });
                    });
                });

                describe('when not set', function () {
                    it('should be inferred from data', function (done) {
                        var runner = new Runner(),
                            data = [
                                {a: 'b'},
                                {c: 'd'},
                                {e: 'f'}
                            ];

                        runner.run(collection, {data}, function (err, run) {
                            expect(err).to.be.null;
                            expect(run).to.nested.include({
                                'options.iterationCount': 3
                            });

                            expect(run).to.nested.include({
                                'state.data': data
                            });
                            done();
                        });
                    });
                });
            });
        });
    });
});
