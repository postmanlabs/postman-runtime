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

    describe('should stream rows to the script over the pull protocol', function () {
        var testrun,
            cancelled = 0,
            released = 0,
            TOTAL = 3,
            datasetsResolverStub = sinon.stub().callsFake(function (cmd, datasetId, args, callback) {
                callback(null, {
                    columns: ['id', 'name'],
                    // rides along on the head frame, like any field that is not
                    // `rows`/`cancel`
                    staleDatasources: ['ds-9'],
                    rows: (async function *() {
                        try {
                            for (var i = 0; i < TOTAL; i++) { yield { id: i, name: 'row-' + i }; }
                        }
                        finally { released += 1; }
                    }()),
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
                                exec: `
                                    const result = await pm.datasets('ds-123')
                                        .executeQuery('SELECT * FROM users');
                                    const rows = [];

                                    for await (const row of result.rows) {
                                        rows.push(row);
                                    }

                                    console.log(JSON.stringify({
                                        columns: result.columns,
                                        staleDatasources: result.staleDatasources,
                                        rows: rows
                                    }));
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

        it('should have delivered every row, plus the head frame fields', function () {
            var logged = JSON.parse(testrun.console.getCall(0).args.slice(2)[0]);

            expect(logged).to.eql({
                columns: ['id', 'name'],
                staleDatasources: ['ds-9'],
                rows: [
                    { id: 0, name: 'row-0' },
                    { id: 1, name: 'row-1' },
                    { id: 2, name: 'row-2' }
                ]
            });
        });

        it('should have released the exhausted stream both ways', function () {
            // The source frees itself through its own `finally` when the last pull
            // drains it, and the runner calls `cancel` on the same terminal — which is
            // why a resolver's `cancel` has to be idempotent.
            expect(released).to.equal(1);
            expect(cancelled).to.equal(1);
        });
    });

    describe('should pull a streamed result in bounded batches', function () {
        // Proves the result is not materialised before the script sees it: the source
        // can yield far more rows than the script consumes, and the runner must only
        // have advanced it as far as the batches the script actually asked for.
        var testrun,
            cancelled = 0,
            produced = 0,
            AVAILABLE = 5000,
            CONSUMED = 1500,
            datasetsResolverStub = sinon.stub().callsFake(function (cmd, datasetId, args, callback) {
                callback(null, {
                    columns: ['n'],
                    rows: (async function *() {
                        for (var i = 0; i < AVAILABLE; i++) {
                            produced += 1;
                            yield { n: i };
                        }
                    }()),
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
                                exec: `
                                    const result = await pm.datasets('ds-123')
                                        .executeQuery('SELECT n FROM big');
                                    let count = 0, first = null, last = null, ordered = true;

                                    for await (const row of result.rows) {
                                        (count === 0) && (first = row.n);
                                        (last !== null) && (row.n !== last + 1) && (ordered = false);
                                        last = row.n;

                                        if (++count === ${CONSUMED}) { break; }
                                    }

                                    console.log(JSON.stringify({ count, first, last, ordered }));
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

        it('should have delivered the consumed rows in order', function () {
            expect(JSON.parse(testrun.console.getCall(0).args.slice(2)[0])).to.eql({
                count: CONSUMED,
                first: 0,
                last: CONSUMED - 1,
                ordered: true
            });
        });

        it('should not have drained the source past the batches the script asked for', function () {
            // 1500 rows consumed at a 1000-row batch means two pulls, so the source is
            // advanced to 2000 and no further. Asserted as a range rather than exactly
            // 2000 so the batch size stays free to change; the point is that it is
            // bounded by consumption and nowhere near AVAILABLE.
            expect(produced).to.be.at.least(CONSUMED);
            expect(produced).to.be.below(AVAILABLE);
        });

        it('should have released the cursor when the script broke out early', function () {
            expect(cancelled).to.equal(1);
        });
    });

    describe('should release a streaming cursor the script leaves open (teardown backstop)', function () {
        var testrun,
            cancelled = 0,
            datasetsResolverStub = sinon.stub().callsFake(function (cmd, datasetId, args, callback) {
                // Streaming reply: async-iterable rows + a cancel that releases the
                // engine cursor. The script never iterates result.rows, so no
                // pull/cancel handshake fires — the runner must still release
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

    describe('a streaming resolver that supplies no cancel', function () {
        // Documents why `cancel` is part of the streaming resolver contract rather
        // than optional. The script opened the stream but never began iterating, so
        // the generator is suspended *before* its `try` and completing it does not
        // enter the body — its `finally` cannot run. Once iteration has begun,
        // teardown does resume the generator into its `finally`.
        //
        // Priming the iterator (`next()` then `return()`) would run the `finally`,
        // deliberately not done: it performs the first batch of real I/O for a stream
        // the script abandoned, and for a resolver that acquires its cursor lazily
        // inside the generator it would open a cursor that was never otherwise
        // opened. A resolver holding a cursor outside its generator must supply
        // `cancel`.
        var testrun,
            released = 0,
            datasetsResolverStub = sinon.stub().callsFake(function (cmd, datasetId, args, callback) {
                callback(null, {
                    columns: ['id'],
                    rows: (async function *() {
                        try {
                            yield { id: 1 };
                            yield { id: 2 };
                        }
                        finally { released += 1; }
                    }())
                });
            });

        before(function (done) {
            this.run({
                collection: {
                    item: {
                        event: [{
                            listen: 'prerequest',
                            script: {
                                // opens the stream, never iterates result.rows
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

        it('should still complete the run', function () {
            expect(testrun).to.be.ok;
            expect(testrun.done.getCall(0).args[0]).to.be.null;
        });

        it('should not be able to release a generator that never started', function (done) {
            setImmediate(function () {
                expect(released).to.equal(0);
                done();
            });
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
