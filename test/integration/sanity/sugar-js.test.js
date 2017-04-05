describe('Sugar.js', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
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
        }, function(err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function() {
        expect(testrun).be.ok();
        expect(testrun.test.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.tests')).to.eql({
            'Array prototype none': true,
            'Array prototype any': true,
            'Array prototype average': true,
            'Date prototype getTime': true,
            'Function prototype once': true,
            'Number prototype hex': true,
            'Number prototype isEven': true,
            'Number prototype ordinalize': false,
            'Number prototype format': false,
            'String prototype endsWith': true,
            'String prototype negated endsWith': true,
            'String prototype camelize': true,
            'String prototype repeat': true,
            'String prototype shift': true,
            'String prototype spacify': true
        });
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
