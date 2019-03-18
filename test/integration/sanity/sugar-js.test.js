var expect = require('chai').expect;

describe('Sugar.js', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'tests[\'Array prototype none\'] = ["a", "b", "c"].none("d");',
                                'tests[\'Array prototype any\'] = [ [1,2], [2,3] ].any([2,3]);',
                                'tests[\'Array prototype average\'] = [ 1, 2, 3, 4, 5 ].average() === 3;',
                                'tests[\'Date prototype getTime\'] = Date.now()==(new Date()).getTime();',
                                'var fCount = 0;',
                                'var fn = (function() {',
                                '  fCount++;',
                                '}).once(); fn(); fn(); fn();',
                                'tests[\'Function prototype once\'] = fCount===1;',
                                'tests[\'Number prototype hex\'] = (56).hex() === "38";',
                                'tests[\'Number prototype isEven\'] = (56).isEven() === true;',
                                'tests[\'Number prototype ordinalize\'] = (56).ordinalize() === "56 th";',
                                'tests[\'Number prototype format\'] = (56789.10).format() === "56, 789.1";',
                                '// Extended String prototype tests',
                                'tests[\'String prototype endsWith\'] = "jumpy".endsWith("py");',
                                'tests[\'String prototype negated endsWith\'] = !("jumpy".endsWith("MPY"));',
                                'tests[\'String prototype camelize\'] = "a - beta".camelize() === "ABeta";',
                                'tests[\'String prototype repeat\'] = "a".repeat(5) === "aaaaa";',
                                'tests[\'String prototype shift\'] = "abc".shift(5) === "fgh";',
                                'tests[\'String prototype spacify\'] = "a - b_cD".spacify() === "a b c d";'
                            ]
                        }
                    }],
                    request: {
                        url: 'postman-echo.com/get',
                        method: 'GET'
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have run the test script successfully', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'test.calledOnce': true
        });

        expect(testrun.test.getCall(0).args[0]).to.be.null;
        expect(testrun.assertion.getCall(0).args[1]).to.eql([
            {error: null, index: 0, passed: true, skipped: false, name: 'Array prototype none'},
            {error: null, index: 1, passed: true, skipped: false, name: 'Array prototype any'},
            {error: null, index: 2, passed: true, skipped: false, name: 'Array prototype average'},
            {error: null, index: 3, passed: true, skipped: false, name: 'Date prototype getTime'},
            {error: null, index: 4, passed: true, skipped: false, name: 'Function prototype once'},
            {error: null, index: 5, passed: true, skipped: false, name: 'Number prototype hex'},
            {error: null, index: 6, passed: true, skipped: false, name: 'Number prototype isEven'},
            {
                error: {message: 'expected false to be truthy', name: 'AssertionError', type: 'Error'},
                index: 7,
                passed: false,
                skipped: false,
                name: 'Number prototype ordinalize'
            },
            {
                error: {message: 'expected false to be truthy', name: 'AssertionError', type: 'Error'},
                index: 8,
                passed: false,
                skipped: false,
                name: 'Number prototype format'
            },
            {error: null, index: 9, passed: true, skipped: false, name: 'String prototype endsWith'},
            {error: null, index: 10, passed: true, skipped: false, name: 'String prototype negated endsWith'},
            {error: null, index: 11, passed: true, skipped: false, name: 'String prototype camelize'},
            {error: null, index: 12, passed: true, skipped: false, name: 'String prototype repeat'},
            {error: null, index: 13, passed: true, skipped: false, name: 'String prototype shift'},
            {error: null, index: 14, passed: true, skipped: false, name: 'String prototype spacify'}
        ]);
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
