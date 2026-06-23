/**
 * Unit tests for the per-partition (per-VU) cookie jar.
 *
 * Covers the allocation/lifecycle seams in isolation:
 *   - Partition#getCookieJar / Partition#resetCookieJar
 *   - PartitionManager#stopSinglePartition jar reset (custom mode only)
 *   - RequesterPool#create per-trace jar override (no shared-options mutation)
 *   - Run#getCookieJarFor resolution + gating rules
 *
 * The end-to-end wire behavior (Set-Cookie isolation across partitions
 * against a real HTTP server) lives in
 * test/integration/runner-spec/perPartitionCookieJar.test.js.
 */

var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    EventEmitter = require('events').EventEmitter,
    sdk = require('postman-collection'),
    IS_NODE = typeof window === 'undefined',

    /**
     * Minimal jar stand-in for option-precedence tests.
     *
     * @returns {Object} object that looks like a cookie jar
     */
    stubJar = function () {
        return { getCookies () { return undefined; } };
    },
    Partition = require('../../lib/runner/partition'),
    PartitionManager = require('../../lib/runner/partition-manager'),
    EventCommand = require('../../lib/runner/extensions/event.command'),
    RequesterPool = require('../../lib/requester').RequesterPool,
    Run = require('../../lib/runner/run');

(IS_NODE ? describe : describe.skip)('per-partition cookie jar (unit)', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('Partition#getCookieJar', function () {
        var runInstance = {
            state: null,
            options: {}
        };

        it('starts with no jar allocated (lazy)', function () {
            var partition = new Partition(runInstance, 0, 1, 0);

            expect(partition.cookieJar).to.be.null;
        });

        it('lazily allocates a tough-cookie jar with a store and memoizes it', function () {
            var partition = new Partition(runInstance, 0, 1, 0),
                jar = partition.getCookieJar();

            expect(jar).to.be.an('object');
            // programmatic access (pm.cookies.jar()) requires .store
            expect(jar.store).to.be.an('object');
            expect(jar.getCookies).to.be.a('function');

            // memoized — same instance on every subsequent call
            expect(partition.getCookieJar()).to.equal(jar);
            expect(partition.cookieJar).to.equal(jar);
        });

        it('never shares a jar between two partitions', function () {
            var p0 = new Partition(runInstance, 0, 1, 0),
                p1 = new Partition(runInstance, 0, 1, 1);

            expect(p0.getCookieJar()).to.not.equal(p1.getCookieJar());
        });

        it('resetCookieJar drops the jar; next getCookieJar allocates a fresh one', function () {
            var after,
                partition = new Partition(runInstance, 0, 1, 0),
                before = partition.getCookieJar();

            partition.resetCookieJar();
            expect(partition.cookieJar).to.be.null;

            after = partition.getCookieJar();

            expect(after).to.be.an('object');
            expect(after).to.not.equal(before);
        });
    });

    describe('PartitionManager#stopSinglePartition', function () {
        function managerFor (isCustom) {
            var mockRunInstance = {
                    options: {
                        iterationCount: 1,
                        maxConcurrency: 1,
                        customParallelIterations: isCustom
                    },
                    state: { items: [{ id: 'item1' }] },
                    queue: sinon.stub(),
                    triggers: sinon.stub()
                },
                manager = new PartitionManager(mockRunInstance);

            manager.spawn();
            manager.options = mockRunInstance.options;
            manager.createSinglePartition(0);

            return manager;
        }

        it('resets the jar in customParallelIterations mode', function () {
            var manager = managerFor(true),
                partition = manager.partitions[0],
                deadJar = partition.getCookieJar();

            manager.stopSinglePartition(0);

            expect(partition.cookieJar).to.be.null;
            expect(partition.getCookieJar()).to.not.equal(deadJar);
        });

        it('leaves the jar alone outside customParallelIterations mode', function () {
            var manager = managerFor(false),
                partition = manager.partitions[0],
                jar = partition.getCookieJar();

            manager.stopSinglePartition(0);

            expect(partition.cookieJar).to.equal(jar);
        });
    });

    describe('RequesterPool#create', function () {
        var pool;

        beforeEach(function (done) {
            // the constructor invokes its callback synchronously (no
            // extendedRootCA path) — defer so the assignment completes
            // before the test body runs
            pool = new RequesterPool({}, function () { setImmediate(done); });
        });

        it('allocates a shared default jar when none is supplied', function () {
            expect(pool.options.cookieJar).to.be.an('object');
        });

        it('passes the pool options by reference when trace has no jar (status quo)', function (done) {
            pool.create({ type: 'http' }, function (err, requester) {
                if (err) { return done(err); }

                expect(requester.options).to.equal(pool.options);
                done();
            });
        });

        it('overrides the jar via a merged copy when trace.cookieJar is set', function (done) {
            var perPartitionJar = stubJar(),
                sharedJar = pool.options.cookieJar;

            pool.create({ type: 'http', cookieJar: perPartitionJar }, function (err, requester) {
                if (err) { return done(err); }

                // requester sees the per-partition jar...
                expect(requester.options.cookieJar).to.equal(perPartitionJar);
                // ...other pool options are inherited...
                expect(requester.options.keepAlive).to.equal(pool.options.keepAlive);
                // ...and the shared pool options are NOT mutated
                expect(requester.options).to.not.equal(pool.options);
                expect(pool.options.cookieJar).to.equal(sharedJar);
                done();
            });
        });
    });

    describe('Run#getCookieJarFor', function () {
        function makeRun (options) {
            var run = new Run({ items: [] }, options);

            // areIterationsParallelized is normally set in Run#start;
            // set it directly to unit-test the resolution rule.
            run.areIterationsParallelized = true;
            run.partitionManager.spawn();
            run.partitionManager.options = run.options;
            run.partitionManager.createSinglePartition(0);

            return run;
        }

        it('returns undefined when the flag is off', function () {
            var run = makeRun({ customParallelIterations: true });

            expect(run.getCookieJarFor({ partitionIndex: 0 })).to.be.undefined;
        });

        it('returns the owning partition jar when the flag is on', function () {
            var run = makeRun({
                    customParallelIterations: true,
                    requester: { perPartitionCookieJar: true }
                }),
                jar = run.getCookieJarFor({ partitionIndex: 0 });

            expect(jar).to.be.an('object');
            expect(jar).to.equal(run.partitionManager.partitions[0].getCookieJar());
        });

        it('returns undefined when iterations are not parallelized', function () {
            var run = new Run({ items: [] }, {
                requester: { perPartitionCookieJar: true }
            });

            // waterfall mode — Run#start never set areIterationsParallelized
            expect(run.getCookieJarFor({ partitionIndex: 0 })).to.be.undefined;
        });

        it('returns undefined for an unknown partition index', function () {
            var run = makeRun({
                customParallelIterations: true,
                requester: { perPartitionCookieJar: true }
            });

            expect(run.getCookieJarFor({ partitionIndex: 7 })).to.be.undefined;
            expect(run.getCookieJarFor({})).to.be.undefined;
            expect(run.getCookieJarFor()).to.be.undefined;
        });

        it('is disabled when an explicit requester.cookieJar is supplied (explicit jar wins)', function () {
            sinon.stub(console, 'warn'); // silence the one-time warning

            var run = makeRun({
                customParallelIterations: true,
                requester: {
                    perPartitionCookieJar: true,
                    cookieJar: stubJar()
                }
            });

            expect(run.perPartitionCookieJar).to.be.false;
            expect(run.getCookieJarFor({ partitionIndex: 0 })).to.be.undefined;
        });

        it('warns when both perPartitionCookieJar and cookieJar are supplied', function () {
            var warn = sinon.stub(console, 'warn');

            makeRun({
                customParallelIterations: true,
                requester: {
                    perPartitionCookieJar: true,
                    cookieJar: stubJar()
                }
            });

            expect(warn.calledOnce).to.be.true;
            expect(warn.firstCall.args[0]).to.include('perPartitionCookieJar');
        });
    });

    describe('event.command cookie jar resolution', function () {
        function cookieJarWithStore (store) {
            return {
                store
            };
        }

        function runEvent (getCookieJarFor, sharedCookieJar, options, done) {
            if (typeof options === 'function') {
                done = options;
                options = {};
            }

            var host = new EventEmitter(),
                item = new sdk.Item({
                    name: 'request',
                    request: 'https://example.com',
                    event: [{
                        listen: 'prerequest',
                        script: {
                            type: 'text/javascript',
                            exec: ['var value = 1;']
                        }
                    }]
                }),
                runnerContext;

            host.dispatch = sinon.stub();
            host.execute = sinon.stub().callsFake(function (event, options, callback) {
                host.emit('execution.cookies.' + options.id, 'cookie-event-id', 'store', 'findCookies',
                    ['example.com', '/']);

                callback(null, {});
            });

            runnerContext = {
                options: {},
                state: options.state || {},
                requester: {
                    options: {
                        cookieJar: sharedCookieJar
                    }
                },
                host: host,
                getCookieJarFor: getCookieJarFor,
                triggers: {
                    beforePrerequest: sinon.stub(),
                    beforeScript: sinon.stub(),
                    script: sinon.stub(),
                    prerequest: sinon.stub()
                }
            };

            EventCommand.process.event.call(runnerContext, {
                name: 'prerequest',
                item: item,
                coords: { partitionIndex: 0 },
                context: {}
            }, function (err) {
                if (err) { return done(err); }

                done(null, host, runnerContext);
            });
        }

        it('uses the partition cookie jar when one is resolved for the cursor', function (done) {
            var partitionStore = {
                    findCookies: sinon.stub().callsArgWith(2, null, ['partition-cookie'])
                },
                sharedStore = {
                    findCookies: sinon.stub().callsArgWith(2, null, ['shared-cookie'])
                },
                partitionCookieJar = cookieJarWithStore(partitionStore),
                sharedCookieJar = cookieJarWithStore(sharedStore),
                getCookieJarFor = sinon.stub().returns(partitionCookieJar);

            runEvent(getCookieJarFor, sharedCookieJar, function (err, host) {
                if (err) { return done(err); }

                expect(getCookieJarFor.calledOnce).to.be.true;
                expect(getCookieJarFor.firstCall.args[0]).to.deep.equal({ partitionIndex: 0 });
                expect(partitionStore.findCookies.calledOnceWithExactly('example.com', '/', sinon.match.func))
                    .to.be.true;
                expect(sharedStore.findCookies.called).to.be.false;
                expect(host.dispatch.calledWith('execution.cookies.' +
                    host.execute.firstCall.args[1].id, 'cookie-event-id', null, ['partition-cookie'])).to.be.true;

                done();
            });
        });

        it('falls back to the shared requester cookie jar when no partition jar is resolved', function (done) {
            var sharedStore = {
                    findCookies: sinon.stub().callsArgWith(2, null, ['shared-cookie'])
                },
                sharedCookieJar = cookieJarWithStore(sharedStore),
                getCookieJarFor = sinon.stub().returns();

            runEvent(getCookieJarFor, sharedCookieJar, function (err, host) {
                if (err) { return done(err); }

                expect(getCookieJarFor.calledOnce).to.be.true;
                expect(getCookieJarFor.firstCall.args[0]).to.deep.equal({ partitionIndex: 0 });
                expect(sharedStore.findCookies.calledOnceWithExactly('example.com', '/', sinon.match.func))
                    .to.be.true;
                expect(host.dispatch.calledWith('execution.cookies.' +
                    host.execute.firstCall.args[1].id, 'cookie-event-id', null, ['shared-cookie'])).to.be.true;

                done();
            });
        });

        it('uses the nested request root cursor for script callbacks', function (done) {
            var rootCursor = {
                    partitionIndex: 0,
                    ref: 'root-cursor'
                },
                sharedStore = {
                    findCookies: sinon.stub().callsArgWith(2, null, ['shared-cookie'])
                },
                sharedCookieJar = cookieJarWithStore(sharedStore),
                getCookieJarFor = sinon.stub().returns();

            runEvent(getCookieJarFor, sharedCookieJar, {
                state: {
                    nestedRequest: {
                        rootCursor: rootCursor,
                        rootItem: { id: 'root-item-id' }
                    }
                }
            }, function (err, host, runnerContext) {
                var scriptCursor;

                if (err) { return done(err); }

                expect(runnerContext.triggers.beforeScript.calledOnce).to.be.true;

                scriptCursor = runnerContext.triggers.beforeScript.firstCall.args[1];
                expect(scriptCursor).to.deep.equal(rootCursor);
                expect(scriptCursor).to.not.equal(rootCursor);

                done();
            });
        });
    });
});
