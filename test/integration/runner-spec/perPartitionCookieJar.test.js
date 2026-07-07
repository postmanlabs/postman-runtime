/**
 * End-to-end integration tests for requester.perPartitionCookieJar.
 *
 * Wire-level proof against a LOCAL http server (no external network):
 * the server records the Cookie header it receives on every /read and
 * issues Set-Cookie on every /set, so cross-partition contamination is
 * observed exactly where it matters — on the wire — rather than through
 * pm.* scopes.
 *
 * All tests sequence partition loops deterministically (partition 1
 * starts only after partition 0's loops complete), so assertions are
 * exact instead of statistical:
 *   - shared jar (flag off / explicit jar): partition 1's first read
 *     MUST carry partition 0's cookie
 *   - per-partition jars (flag on): partition 1's first read MUST
 *     carry nothing
 *
 * Complements test/unit/per-partition-cookie-jar.test.js, which covers
 * the allocation/lifecycle seams with mocks.
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

(IS_NODE ? describe : describe.skip)('requester.perPartitionCookieJar end-to-end', function () {
    this.timeout(30 * 1000); // local server only — should be fast

    var httpServer,
        reads; // [{partition, cookie}] in arrival order, recorded by the server

    before(function (done) {
        httpServer = server.createHTTPServer();

        httpServer.on('/read', function (req, res) {
            reads.push({
                partition: url.parse(req.url, true).query.partition,
                cookie: req.headers.cookie || ''
            });
            res.writeHead(200, { 'content-type': 'text/plain' });
            res.end('ok');
        });

        httpServer.on('/set', function (req, res) {
            res.writeHead(200, {
                'content-type': 'text/plain',
                'set-cookie': 'marker=' + url.parse(req.url, true).query.marker + '; Path=/'
            });
            res.end('ok');
        });

        httpServer.listen(0, done);
    });

    after(function (done) {
        httpServer.destroy(done);
    });

    afterEach(function () {
        sinon.restore();
    });

    // Collection: each loop reads first (observing whatever the jar
    // attaches), then sets this partition's marker cookie. Read-first
    // ordering is what makes shared-vs-isolated deterministic for the
    // next partition.
    function readThenSetCollection () {
        return new Collection({
            item: [
                { id: 'read-item', name: 'read', request: httpServer.url + '/read?partition={{marker}}' },
                { id: 'set-item', name: 'set', request: httpServer.url + '/set?marker={{marker}}' }
            ]
        });
    }

    function markerScope (marker) {
        return new VariableScope({ values: [{ key: 'marker', value: marker }] });
    }

    /**
     * Drives a custom-mode run through an explicit schedule.
     *
     * @param {Object} opts -
     * @param {Collection} opts.collection -
     * @param {Object} [opts.requester] - requester options for the run
     * @param {Array} opts.schedule - array of steps executed in order:
     *   { start: <partitionIndex>, marker: <String> }  → startParallelIteration
     *   { stop: <partitionIndex> }                     → stopParallelIteration
     *   each `start` step consumes one iteration trigger before advancing.
     * @param {Function} done - (err, spies)
     */
    function runSchedule (opts, done) {
        var runner = new Runner({}),
            spies = {},
            stepIndex = 0,
            completed = false,
            aborting = false,
            run;

        // each schedule owns the server-side observation log (describe
        // blocks call runSchedule from their before-all hook, which runs
        // before any root-level beforeEach could reset this)
        reads = [];

        _.forEach(_.keys(Runner.Run.triggers), function (name) {
            spies[name] = sinon.spy();
        });

        function finish (err) {
            if (completed) { return; }

            completed = true;
            run && run.host && setTimeout(function () { run.host.dispose(); }, 0);
            done(err, spies);
        }

        function advance () {
            if (completed || aborting) { return; }

            var step = opts.schedule[stepIndex];

            // schedule exhausted — wind down
            if (!step) {
                aborting = true;

                return run.abort(_.noop);
            }

            stepIndex += 1;

            if (typeof step.stop === 'number') {
                // stop consumes no iteration trigger; advance immediately
                return run.stopParallelIteration(step.stop, function () { advance(); });
            }

            run.startParallelIteration(step.start, markerScope(step.marker), _.noop);
        }

        runner.run(opts.collection, _.assign({
            customParallelIterations: true,
            iterationCount: 1,
            maxConcurrency: 1
        }, opts.requester ? { requester: opts.requester } : {}), function (err, runInstance) {
            if (err) { return finish(err); }
            run = runInstance;

            spies.start = sinon.spy(function () { advance(); });
            spies.iteration = sinon.spy(function () { advance(); });
            spies.done = sinon.spy(function () { finish(null); });

            run.start(spies);
        });
    }

    describe('flag ON — wire isolation and partition-lifetime persistence', function () {
        before(function (done) {
            runSchedule({
                collection: readThenSetCollection(),
                requester: { perPartitionCookieJar: true },
                schedule: [
                    { start: 0, marker: 'p0' }, // partition 0 loop 1: read (empty), set p0
                    { start: 0, marker: 'p0' }, // partition 0 loop 2: read (own cookie persists)
                    { start: 1, marker: 'p1' }, // partition 1 loop 1: read — must NOT see p0
                    { start: 1, marker: 'p1' } // partition 1 loop 2: read (own cookie persists)
                ]
            }, done);
        });

        it('keeps partition 1 blind to partition 0\'s cookie even though partition 0 set it first', function () {
            expect(reads[2]).to.eql({ partition: 'p1', cookie: '' });
        });

        it('persists each partition\'s own cookie across loop iterations (sign-in-once pattern)', function () {
            expect(reads).to.eql([
                { partition: 'p0', cookie: '' },
                { partition: 'p0', cookie: 'marker=p0' },
                { partition: 'p1', cookie: '' },
                { partition: 'p1', cookie: 'marker=p1' }
            ]);
        });
    });

    describe('flag OFF — pins the shared-jar status quo', function () {
        before(function (done) {
            runSchedule({
                collection: readThenSetCollection(),
                schedule: [
                    { start: 0, marker: 'p0' },
                    { start: 1, marker: 'p1' }
                ]
            }, done);
        });

        it('leaks partition 0\'s cookie into partition 1\'s first request (the bug this option fixes)', function () {
            expect(reads).to.eql([
                { partition: 'p0', cookie: '' },
                { partition: 'p1', cookie: 'marker=p0' }
            ]);
        });
    });

    describe('flag ON + explicit requester.cookieJar — explicit jar wins', function () {
        var runSpies;

        before(function (done) {
            runSchedule({
                collection: readThenSetCollection(),
                requester: {
                    perPartitionCookieJar: true,
                    cookieJar: RequestCookieJar()
                },
                schedule: [
                    { start: 0, marker: 'p0' },
                    { start: 1, marker: 'p1' }
                ]
            }, function (err, spies) {
                runSpies = spies;
                done(err);
            });
        });

        it('behaves as a shared (caller-owned) jar across partitions', function () {
            expect(reads).to.eql([
                { partition: 'p0', cookie: '' },
                { partition: 'p1', cookie: 'marker=p0' }
            ]);
        });

        it('surfaces the ignored warning through the console trigger (not raw stdout)', function () {
            var warned = runSpies.console.getCalls().filter(function (call) {
                return call.args[1] === 'warn' &&
                    typeof call.args[2] === 'string' &&
                    _.includes(call.args[2], 'perPartitionCookieJar is ignored');
            });

            expect(warned).to.have.lengthOf(1);
        });
    });

    describe('flag ON — full fresh on reuse (stop + restart)', function () {
        before(function (done) {
            runSchedule({
                collection: readThenSetCollection(),
                requester: { perPartitionCookieJar: true },
                schedule: [
                    { start: 0, marker: 'p0' }, // loop 1: read (empty), set p0
                    { start: 0, marker: 'p0' }, // loop 2: read (cookie present)
                    { stop: 0 }, // partition recycled — jar must reset
                    { start: 0, marker: 'p0-reborn' } // loop 3: read must be empty again
                ]
            }, done);
        });

        it('gives the recycled partition an empty jar (no residue from the stopped one)', function () {
            expect(reads).to.eql([
                { partition: 'p0', cookie: '' },
                { partition: 'p0', cookie: 'marker=p0' },
                { partition: 'p0-reborn', cookie: '' }
            ]);
        });
    });

    describe('flag ON — programmatic access (pm.cookies.jar()) is partition-scoped', function () {
        before(function (done) {
            var collection = new Collection({
                item: [{
                    id: 'prog-item',
                    name: 'programmatic',
                    request: httpServer.url + '/read?partition={{marker}}',
                    event: [{
                        listen: 'prerequest',
                        script: {
                            type: 'text/javascript',
                            exec: [
                                '// write into the jar via the sandbox cookie-store bridge,',
                                '// then let the request prove (on the wire) which jar took it',
                                'const jar = pm.cookies.jar();',
                                'const marker = pm.variables.get("marker");',
                                'jar.set("' + httpServer.url + '", "prog", marker, function (err) {',
                                '    if (err) { throw err; }',
                                '});'
                            ].join('\n')
                        }
                    }]
                }]
            });

            runSchedule({
                collection: collection,
                requester: { perPartitionCookieJar: true },
                schedule: [
                    { start: 0, marker: 'p0' },
                    { start: 1, marker: 'p1' }
                ]
            }, done);
        });

        it('routes script jar writes to the writing partition\'s own jar only', function () {
            expect(reads).to.eql([
                { partition: 'p0', cookie: 'prog=p0' },
                { partition: 'p1', cookie: 'prog=p1' } // NOT 'prog=p0; prog=p1'
            ]);
        });
    });

    describe('flag ON — pm.sendRequest cookies land in the sender\'s partition jar', function () {
        before(function (done) {
            var collection = new Collection({
                item: [{
                    id: 'sr-item',
                    name: 'send-request',
                    request: httpServer.url + '/read?partition={{marker}}',
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: [
                                '// nested request sets a cookie; it must land in THIS',
                                '// partition\'s jar so the next loop\'s read item sees it',
                                '// (note: pm.sendRequest does not template-resolve {{vars}},',
                                '// so build the URL from pm.variables explicitly)',
                                'const url = "' + httpServer.url + '/set?marker=sr-" + pm.variables.get("marker");',
                                'pm.sendRequest(url, function (err) {',
                                '    if (err) { throw err; }',
                                '});'
                            ].join('\n')
                        }
                    }]
                }]
            });

            runSchedule({
                collection: collection,
                requester: { perPartitionCookieJar: true },
                schedule: [
                    { start: 0, marker: 'p0' }, // loop 1: read empty, sendRequest sets sr-p0
                    { start: 0, marker: 'p0' }, // loop 2: read must carry sr-p0
                    { start: 1, marker: 'p1' } // partition 1 must not see partition 0's sendRequest cookie
                ]
            }, done);
        });

        it('makes the nested request\'s Set-Cookie visible to the same partition only', function () {
            expect(reads).to.eql([
                { partition: 'p0', cookie: '' },
                { partition: 'p0', cookie: 'marker=sr-p0' },
                { partition: 'p1', cookie: '' }
            ]);
        });
    });
});
