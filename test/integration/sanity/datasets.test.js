var expect = require('chai').expect,
    sinon = require('sinon');

describe('datasets', function () {
    describe('should be able to call pm.datasets(id).executeQuery via datasetsResolver', function () {
        var testrun,
            datasetsResolverStub = sinon.stub().callsFake(function (cmd, datasetId, args, callback) {
                if (cmd === 'executeQuery' && datasetId === 'ds-123') {
                    return callback(null, { rows: [{ id: 1, name: 'Alice' }] });
                }

                callback(new Error('unexpected call'));
            });

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                    const result = await pm.datasets('ds-123').executeQuery('SELECT * FROM users');
                                    const rows = [];

                                    for await (const row of result.rows) {
                                        rows.push(row);
                                    }

                                    console.log(JSON.stringify({ columns: result.columns, rows: rows }));
                                `
                            }
                        }],
                        request: global.servers.http
                    }
                },
                script: {
                    datasetsResolver: datasetsResolverStub
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

        it('should have called the datasetsResolver with correct arguments', function () {
            expect(datasetsResolverStub.calledOnce).to.be.true;

            var call = datasetsResolverStub.getCall(0);

            expect(call.args[0]).to.equal('executeQuery');
            expect(call.args[1]).to.equal('ds-123');
            expect(call.args[2]).to.deep.include.members(['SELECT * FROM users']);
        });

        it('should have received the result in the script', function () {
            var consoleArgs = testrun.console.getCall(0).args.slice(2);

            expect(JSON.parse(consoleArgs[0])).to.deep.equal({
                columns: [],
                rows: [{ id: 1, name: 'Alice' }]
            });
        });
    });

    describe('should release a streaming cursor the script leaves open (teardown backstop)', function () {
        var testrun,
            cancelled = 0,
            datasetsResolverStub = sinon.stub().callsFake(function (cmd, datasetId, args, callback) {
                // Streaming reply: async-iterable rows + a cancel that releases the
                // engine cursor. The script never iterates result.rows, so no
                // __pull/__cancel handshake fires — the runner must still release
                // the cursor when the execution tears down.
                callback(null, {
                    columns: ['id'],
                    rows: (async function *() { yield { id: 1 }; yield { id: 2 }; }()),
                    cancel: function () { cancelled += 1; }
                });
            });

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                // Open the stream but deliberately never iterate result.rows.
                                exec: 'await pm.datasets(\'ds-789\').executeView(\'v-1\');'
                            }
                        }],
                        request: global.servers.http
                    }
                },
                script: {
                    datasetsResolver: datasetsResolverStub
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should have released the cursor via cancel on teardown', function () {
            expect(cancelled).to.equal(1);
        });
    });

    describe('should be able to call pm.datasets(id).executeView via datasetsResolver', function () {
        var testrun,
            datasetsResolverStub = sinon.stub().callsFake(function (cmd, datasetId, args, callback) {
                if (cmd === 'executeView' && datasetId === 'ds-456') {
                    return callback(null, {
                        columns: ['id', 'status'],
                        rows: [{ id: 1, status: args[1][0] }]
                    });
                }

                callback(new Error('unexpected call'));
            });

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                    const result = await pm.datasets('ds-456')
                                        .executeView('active-users', ['active']);
                                    const rows = [];

                                    for await (const row of result.rows) {
                                        rows.push(row);
                                    }

                                    console.log(JSON.stringify({ columns: result.columns, rows: rows }));
                                `
                            }
                        }],
                        request: global.servers.http
                    }
                },
                script: {
                    datasetsResolver: datasetsResolverStub
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should have called the datasetsResolver with correct arguments', function () {
            expect(datasetsResolverStub.calledOnce).to.be.true;

            var call = datasetsResolverStub.getCall(0);

            expect(call.args[0]).to.equal('executeView');
            expect(call.args[1]).to.equal('ds-456');
            expect(call.args[2]).to.deep.equal(['active-users', ['active']]);
        });

        it('should have received the result in the script', function () {
            var consoleArgs = testrun.console.getCall(0).args.slice(2);

            expect(JSON.parse(consoleArgs[0])).to.deep.equal({
                columns: ['id', 'status'],
                rows: [{ id: 1, status: 'active' }]
            });
        });
    });

    describe('should handle datasetsResolver errors', function () {
        var testrun,
            datasetsResolverStub = sinon.stub().callsFake(function (cmd, datasetId, args, callback) {
                callback(new Error('Dataset not found'));
            });

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                    try {
                                        await pm.datasets('ds-missing').executeQuery('SELECT 1');
                                        console.log('no-error');
                                    } catch (e) {
                                        console.log('error:' + e.message);
                                    }
                                `
                            }
                        }],
                        request: global.servers.http
                    }
                },
                script: {
                    datasetsResolver: datasetsResolverStub
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        });

        it('should have completed the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should have called the datasetsResolver', function () {
            expect(datasetsResolverStub.calledOnce).to.be.true;
        });

        it('should have caught the error in the script', function () {
            var consoleArgs = testrun.console.getCall(0).args.slice(2);

            expect(consoleArgs[0]).to.equal('error:Dataset not found');
        });
    });

    describe('pm.datasets should not be available when datasetsResolver is not provided', function () {
        var testrun;

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                exec: `
                                    console.log(typeof pm.datasets);
                                `
                            }
                        }],
                        request: global.servers.http
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
        });

        it('should report pm.datasets as undefined', function () {
            var consoleArgs = testrun.console.getCall(0).args.slice(2);

            expect(consoleArgs[0]).to.equal('undefined');
        });
    });
});
