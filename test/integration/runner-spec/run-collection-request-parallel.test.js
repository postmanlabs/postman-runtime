/**
 * pm.execution.runRequest under customParallelIterations: every partition (VU) of the run calls
 * runRequest on its own, so each partition must get its own nested request chain and its own cookies.
 *
 * Runs against a LOCAL http server that records every hit, so state mixing between partitions is
 * observed on the wire.
 */

var _ = require('lodash'),
    url = require('url'),
    sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    Collection = require('postman-collection').Collection,
    VariableScope = require('postman-collection').VariableScope,
    RequestCookieJar = require('postman-request').jar,
    Runner = require('../../../index.js').Runner,
    IS_NODE = typeof window === 'undefined',
    server = IS_NODE && require('../../fixtures/servers/_servers');

(IS_NODE ? describe : describe.skip)('pm.execution.runRequest with customParallelIterations', function () {
    this.timeout(10 * 1000);

    var httpServer,
        onTarget, // optional hook called with the vu of every /target hit
        hits; // [{path, vu, cookie}] in arrival order, recorded by the server

    before(function (done) {
        httpServer = server.createHTTPServer();

        httpServer.on('/main', function (req, res) {
            var vu = url.parse(req.url, true).query.vu;

            hits.push({ path: '/main', vu: vu, cookie: req.headers.cookie || '' });
            res.writeHead(200, { 'content-type': 'text/plain', 'set-cookie': 'main=' + vu + '; Path=/' });
            res.end('ok');
        });

        // delayed, so that nested requests of concurrent partitions are in flight together
        httpServer.on('/target', function (req, res) {
            var vu = url.parse(req.url, true).query.vu;

            hits.push({ path: '/target', vu: vu, cookie: req.headers.cookie || '' });
            onTarget && onTarget(vu);
            setTimeout(function () {
                res.writeHead(200, { 'content-type': 'text/plain', 'set-cookie': 'nested=' + vu + '; Path=/' });
                res.end('ok');
            }, 100);
        });

        httpServer.listen(0, done);
    });

    after(function (done) {
        httpServer.destroy(done);
    });

    afterEach(function () {
        onTarget = null;
        sinon.restore();
    });

    function mainCollection (testScript) {
        return new Collection({
            item: [{
                id: 'main-item',
                event: [{ listen: 'test', script: { exec: testScript } }],
                request: httpServer.url + '/main?vu={{vu}}'
            }]
        });
    }

    function requestResolver (testScript) {
        return function (_requestId, _context, callback) {
            callback(null, {
                item: {
                    id: 'nested-item',
                    event: testScript ? [{ listen: 'test', script: { exec: testScript } }] : [],
                    request: httpServer.url + '/target?vu={{vu}}'
                }
            });
        };
    }

    /**
     * Drives a custom-mode run: the partitions of a wave start together, the next wave starts once
     * every iteration of the current one is done, and the run is aborted after the last wave.
     *
     * @param {Object} opts -
     * @param {Collection} opts.collection -
     * @param {Object} opts.options - extra run options
     * @param {Array} opts.waves - [[{ index: <partitionIndex>, vu: <String> }]]
     * @param {Function} done - (err, spies)
     */
    function runWaves (opts, done) {
        var spies = {},
            waveIndex = 0,
            pending = 0,
            run;

        hits = [];

        _.forEach(_.keys(Runner.Run.triggers), function (name) {
            spies[name] = sinon.spy();
        });

        function nextWave () {
            var wave = opts.waves[waveIndex++];

            if (!wave) {
                return run.abort(_.noop);
            }

            pending = wave.length;
            wave.forEach(function (start) {
                run.startParallelIteration(start.index,
                    new VariableScope({ values: [{ key: 'vu', value: start.vu }] }), _.noop);
            });
        }

        new Runner({}).run(opts.collection, _.assign({
            customParallelIterations: true
        }, opts.options), function (err, runInstance) {
            if (err) { return done(err); }

            run = runInstance;
            spies.start = sinon.spy(nextWave);
            spies.iteration = sinon.spy(function () {
                --pending === 0 && nextWave();
            });
            spies.done = sinon.spy(function (err) {
                // A run ended by run.abort calls `done` again once timeout.global (3 minutes by default)
                // elapses, with "callback timed out". Only the first call is the run's real end.
                if (spies.done.callCount > 1) { return; }

                setTimeout(function () { run.host.dispose(); }, 0);
                done(err, spies);
            });

            run.start(spies);
        });
    }

    function passedAssertions (spies, name) {
        return _.flatMap(spies.assertion.args, function (args) {
            return _.map(_.filter(args[1], { name: name, passed: true }), function () {
                return args[0].partitionIndex;
            });
        }).sort();
    }

    describe('with a single partition', function () {
        var spies;

        before(function (done) {
            runWaves({
                collection: mainCollection(`
                    const res = await pm.execution.runRequest('nested-item');
                    pm.test('nested request ok', function () {
                        pm.expect(res.code).to.equal(200);
                    });
                `),
                options: { script: { requestResolver: requestResolver() } },
                waves: [[{ index: 0, vu: 'p0' }]]
            }, function (err, _spies) {
                spies = _spies;
                done(err);
            });
        });

        it('should run the nested request and complete the run', function () {
            expect(spies.done.calledOnce).to.be.true;
            expect(spies.done.firstCall.args[0]).to.be.null;
            expect(_.map(hits, 'path')).to.eql(['/main', '/target']);
            expect(passedAssertions(spies, 'nested request ok')).to.eql([0]);
        });
    });

    describe('with partitions calling runRequest concurrently', function () {
        var spies;

        before(function (done) {
            runWaves({
                collection: mainCollection(`
                    console.log('main', pm.variables.get('vu'));
                    const res = await pm.execution.runRequest('nested-item');
                    pm.test('nested request ok', function () {
                        pm.expect(res.code).to.equal(200);
                    });
                `),
                options: {
                    script: { requestResolver: requestResolver('console.log(\'nested\', pm.variables.get(\'vu\'));') }
                },
                waves: [[{ index: 0, vu: 'p0' }, { index: 1, vu: 'p1' }, { index: 2, vu: 'p2' }]]
            }, function (err, _spies) {
                spies = _spies;
                done(err);
            });
        });

        it('should complete the run', function () {
            expect(spies.done.calledOnce).to.be.true;
            expect(spies.done.firstCall.args[0]).to.be.null;
            expect(passedAssertions(spies, 'nested request ok')).to.eql([0, 1, 2]);
        });

        it('should send one nested request per partition', function () {
            expect(_.map(_.filter(hits, { path: '/target' }), 'vu').sort()).to.eql(['p0', 'p1', 'p2']);
        });

        it('should tag the logs of each partition, nested ones included, to that partition', function () {
            var logs = spies.console.args.map(function (args) {
                return args[3] + ':' + args[0].partitionIndex + ':' + args[2];
            }).sort();

            expect(logs).to.eql([
                'p0:0:main', 'p0:0:nested',
                'p1:1:main', 'p1:1:nested',
                'p2:2:main', 'p2:2:nested'
            ]);
        });
    });

    describe('with partitions calling runRequest inside runRequest', function () {
        var spies,
            depthError = 'Max pm.execution.runRequest depth of 3 has been reached.';

        before(function (done) {
            var recurse = 'await pm.execution.runRequest(\'nested-item\');';

            runWaves({
                collection: mainCollection(recurse),
                options: {
                    maxInvokableNestedRequests: 3,
                    script: { requestResolver: requestResolver(recurse) }
                },
                waves: [[{ index: 0, vu: 'p0' }, { index: 1, vu: 'p1' }]]
            }, function (err, _spies) {
                spies = _spies;
                done(err);
            });
        });

        it('should enforce the depth limit for each partition on its own', function () {
            expect(spies.done.calledOnce).to.be.true;
            expect(_.countBy(_.filter(hits, { path: '/target' }), 'vu')).to.eql({ p0: 3, p1: 3 });
        });

        it('should report the depth limit on the root request of each partition', function () {
            var errors = spies.exception.args.map(function (args) {
                return args[0].partitionIndex + ':' + args[1].message;
            }).sort();

            expect(errors).to.eql(['0:' + depthError, '1:' + depthError]);
        });
    });

    // Not partitioned: nested runs keep the run's requester options, so their cookies behave as before
    describe('without partitions', function () {
        function runSequential (requester, done) {
            hits = [];

            new Runner({}).run(mainCollection('await pm.execution.runRequest(\'nested-item\');'), {
                iterationCount: 2,
                data: [{ vu: 'p0' }, { vu: 'p0' }],
                requester: requester,
                script: { requestResolver: requestResolver() }
            }, function (err, run) {
                if (err) { return done(err); }

                run.start({ done });
            });
        }

        it('should share an explicitly passed cookie jar with nested requests', function (done) {
            runSequential({ cookieJar: RequestCookieJar() }, function (err) {
                if (err) { return done(err); }

                expect(hits.map(function (hit) { return hit.path + ':' + hit.cookie; })).to.eql([
                    '/main:', '/target:main=p0', '/main:main=p0; nested=p0', '/target:main=p0; nested=p0'
                ]);
                done();
            });
        });

        it('should give nested requests their own cookie jar when no jar is passed', function (done) {
            runSequential(undefined, function (err) {
                if (err) { return done(err); }

                expect(hits.map(function (hit) { return hit.path + ':' + hit.cookie; })).to.eql([
                    '/main:', '/target:', '/main:main=p0', '/target:'
                ]);
                done();
            });
        });
    });

    describe('with requester.perPartitionCookieJar', function () {
        var spies;

        before(function (done) {
            runWaves({
                collection: mainCollection('await pm.execution.runRequest(\'nested-item\');'),
                options: {
                    requester: { perPartitionCookieJar: true },
                    script: { requestResolver: requestResolver() }
                },
                waves: [
                    [{ index: 0, vu: 'p0' }, { index: 1, vu: 'p1' }],
                    [{ index: 0, vu: 'p0' }, { index: 1, vu: 'p1' }]
                ]
            }, function (err, _spies) {
                spies = _spies;
                done(err);
            });
        });

        it('should complete the run without the per-partition jar warning', function () {
            expect(spies.done.calledOnce).to.be.true;
            expect(spies.console.args.filter(function (args) {
                return args[1] === 'warn';
            })).to.be.empty;
        });

        it('should send the calling partition\'s cookies on nested requests', function () {
            expect(_.filter(hits, { path: '/target' }).slice(0, 2).map(function (hit) {
                return hit.vu + ':' + hit.cookie;
            }).sort()).to.eql(['p0:main=p0', 'p1:main=p1']);
        });

        it('should store cookies set by nested requests in the calling partition\'s jar', function () {
            expect(_.filter(hits, { path: '/main' }).slice(2).map(function (hit) {
                return hit.vu + ':' + hit.cookie;
            }).sort()).to.eql(['p0:main=p0; nested=p0', 'p1:main=p1; nested=p1']);
        });
    });

    describe('with a partition stopped while its runRequest is in flight', function () {
        var spies,
            logs = function () {
                return spies.console.args.map(function (args) { return args.slice(2).join(' '); });
            };

        before(function (done) {
            var run,
                finished = false;

            hits = [];
            spies = {};
            _.forEach(_.keys(Runner.Run.triggers), function (name) {
                spies[name] = sinon.spy();
            });

            // the run is over once the stopped VU's script has given up and the new VU's iteration is done
            function maybeFinish () {
                var all = logs();

                if (!finished && all.includes('second new') && all.some(function (log) {
                    return log.startsWith('second failed old');
                })) {
                    finished = true;
                    run.abort(_.noop);
                }
            }

            // stop VU "old" while its nested request is on the wire, and reuse its index straight away
            onTarget = function (vu) {
                if (vu !== 'old') { return; }

                run.stopParallelIteration(0);
                run.startParallelIteration(0, new VariableScope({ values: [{ key: 'vu', value: 'new' }] }), _.noop);
            };

            new Runner({}).run(mainCollection(`
                await pm.execution.runRequest('nested-item');
                try {
                    await pm.execution.runRequest('nested-item');
                    console.log('second', pm.variables.get('vu'));
                }
                catch (e) {
                    console.log('second failed', pm.variables.get('vu'), e.message);
                }
            `), {
                customParallelIterations: true,
                script: { requestResolver: requestResolver() }
            }, function (err, runInstance) {
                if (err) { return done(err); }

                run = runInstance;
                spies.start = sinon.spy(function () {
                    run.startParallelIteration(0, new VariableScope({ values: [{ key: 'vu', value: 'old' }] }),
                        _.noop);
                });
                spies.console = sinon.spy(maybeFinish);
                spies.done = sinon.spy(function (err) {
                    setTimeout(function () { run.host.dispose(); }, 0);
                    done(err);
                });

                run.start(spies);
            });
        });

        it('should complete the run', function () {
            expect(spies.done.calledOnce).to.be.true;
        });

        it('should not start new nested requests for the stopped partition', function () {
            expect(logs()).to.include('second failed old pm.execution.runRequest: the iteration was stopped.');
            expect(_.filter(hits, { path: '/target', vu: 'old' })).to.have.lengthOf(1);
        });

        it('should give the next occupant of the index its own chain', function () {
            expect(_.filter(hits, { path: '/target', vu: 'new' })).to.have.lengthOf(2);
        });
    });
});
