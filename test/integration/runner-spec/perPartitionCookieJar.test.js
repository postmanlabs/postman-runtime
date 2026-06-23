/**
 * End-to-end integration tests for requester.perPartitionCookieJar.
 *
 * Wire-level proof against a LOCAL http server (no external network):
 * the server records the Cookie header it receives on every /read and
 * issues Set-Cookie on every /set, so cross-partition contamination is
 * observed exactly where it matters — on the wire — rather than through
 * pm.* scopes.
 *
 * All tests sequence VU loops deterministically (VU1 starts only after
 * VU0's loops complete), so assertions are exact instead of statistical:
 *   - shared jar (flag off / explicit jar): VU1's first read MUST carry
 *     VU0's cookie
 *   - per-partition jars (flag on): VU1's first read MUST carry nothing
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
        reads; // [{vu, cookie}] in arrival order, recorded by the server

    before(function (done) {
        httpServer = server.createHTTPServer();

        httpServer.on('/read', function (req, res) {
            reads.push({
                vu: url.parse(req.url, true).query.vu,
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
    // attaches), then sets this VU's marker cookie. Read-first ordering is
    // what makes shared-vs-isolated deterministic for the next VU.
    function readThenSetCollection () {
        return new Collection({
            item: [
                { id: 'read-item', name: 'read', request: httpServer.url + '/read?vu={{marker}}' },
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
     *   { start: <vuIndex>, marker: <String> }  → startParallelIteration
     *   { stop: <vuIndex> }                     → stopParallelIteration
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

    describe('flag ON — wire isolation and VU-lifetime persistence', function () {
        before(function (done) {
            runSchedule({
                collection: readThenSetCollection(),
                requester: { perPartitionCookieJar: true },
                schedule: [
                    { start: 0, marker: 'vu0' }, // VU0 loop 1: read (empty), set vu0
                    { start: 0, marker: 'vu0' }, // VU0 loop 2: read (own cookie persists)
                    { start: 1, marker: 'vu1' }, // VU1 loop 1: read — must NOT see vu0
                    { start: 1, marker: 'vu1' } // VU1 loop 2: read (own cookie persists)
                ]
            }, done);
        });

        it('keeps VU1 blind to VU0\'s cookie even though VU0 set it first', function () {
            expect(reads[2]).to.eql({ vu: 'vu1', cookie: '' });
        });

        it('persists each VU\'s own cookie across loop iterations (sign-in-once pattern)', function () {
            expect(reads).to.eql([
                { vu: 'vu0', cookie: '' },
                { vu: 'vu0', cookie: 'marker=vu0' },
                { vu: 'vu1', cookie: '' },
                { vu: 'vu1', cookie: 'marker=vu1' }
            ]);
        });
    });

    describe('flag OFF — pins the shared-jar status quo', function () {
        before(function (done) {
            runSchedule({
                collection: readThenSetCollection(),
                schedule: [
                    { start: 0, marker: 'vu0' },
                    { start: 1, marker: 'vu1' }
                ]
            }, done);
        });

        it('leaks VU0\'s cookie into VU1\'s first request (the bug this option fixes)', function () {
            expect(reads).to.eql([
                { vu: 'vu0', cookie: '' },
                { vu: 'vu1', cookie: 'marker=vu0' }
            ]);
        });
    });

    describe('flag ON + explicit requester.cookieJar — explicit jar wins', function () {
        before(function (done) {
            sinon.stub(console, 'warn'); // the constructor warns; keep output clean

            runSchedule({
                collection: readThenSetCollection(),
                requester: {
                    perPartitionCookieJar: true,
                    cookieJar: RequestCookieJar()
                },
                schedule: [
                    { start: 0, marker: 'vu0' },
                    { start: 1, marker: 'vu1' }
                ]
            }, done);
        });

        it('behaves as a shared (caller-owned) jar across partitions', function () {
            expect(reads).to.eql([
                { vu: 'vu0', cookie: '' },
                { vu: 'vu1', cookie: 'marker=vu0' }
            ]);
        });
    });

    describe('flag ON — full fresh on reuse (stop + restart)', function () {
        before(function (done) {
            runSchedule({
                collection: readThenSetCollection(),
                requester: { perPartitionCookieJar: true },
                schedule: [
                    { start: 0, marker: 'vu0' }, // loop 1: read (empty), set vu0
                    { start: 0, marker: 'vu0' }, // loop 2: read (cookie present)
                    { stop: 0 }, // VU recycled — jar must reset
                    { start: 0, marker: 'vu0-reborn' } // loop 3: read must be empty again
                ]
            }, done);
        });

        it('gives the reborn VU an empty jar (no residue from the dead VU)', function () {
            expect(reads).to.eql([
                { vu: 'vu0', cookie: '' },
                { vu: 'vu0', cookie: 'marker=vu0' },
                { vu: 'vu0-reborn', cookie: '' }
            ]);
        });
    });

    describe('flag ON — programmatic access (pm.cookies.jar()) is partition-scoped', function () {
        before(function (done) {
            var collection = new Collection({
                item: [{
                    id: 'prog-item',
                    name: 'programmatic',
                    request: httpServer.url + '/read?vu={{marker}}',
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
                    { start: 0, marker: 'vu0' },
                    { start: 1, marker: 'vu1' }
                ]
            }, done);
        });

        it('routes script jar writes to the writing VU\'s own jar only', function () {
            expect(reads).to.eql([
                { vu: 'vu0', cookie: 'prog=vu0' },
                { vu: 'vu1', cookie: 'prog=vu1' } // NOT 'prog=vu0; prog=vu1'
            ]);
        });
    });

    describe('flag ON — pm.sendRequest cookies land in the sender\'s partition jar', function () {
        before(function (done) {
            var collection = new Collection({
                item: [{
                    id: 'sr-item',
                    name: 'send-request',
                    request: httpServer.url + '/read?vu={{marker}}',
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
                    { start: 0, marker: 'vu0' }, // loop 1: read empty, sendRequest sets sr-vu0
                    { start: 0, marker: 'vu0' }, // loop 2: read must carry sr-vu0
                    { start: 1, marker: 'vu1' } // VU1 must not see VU0's sendRequest cookie
                ]
            }, done);
        });

        it('makes the nested request\'s Set-Cookie visible to the same VU only', function () {
            expect(reads).to.eql([
                { vu: 'vu0', cookie: '' },
                { vu: 'vu0', cookie: 'marker=sr-vu0' },
                { vu: 'vu1', cookie: '' }
            ]);
        });
    });
});
