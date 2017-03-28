describe('Escaped formdata', function() {
    var _ = require('lodash'),
        testrun;

    before(function(done) {
        this.run({
            environment: {
                values: [
                    {key: 'msg', value: 'hello\\kworld', type: 'text', name: 'msg', enabled: true},
                    {key: 'msg1', value: 'hello', type: 'text', name: 'msg', enabled: true}
                ]
            },
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: [
                                'var data=JSON.parse(responseBody);',
                                'tests[\'Form Key Replaced\'] = data.form.hasOwnProperty(\'hello\');',
                                'tests[\'Form val replaced from env\'] = data.form.hello === \'hello\\\\kworld\';'
                            ]
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/post?a={{msg}}',
                        method: 'POST',
                        body: {
                            mode: 'urlencoded',
                            urlencoded: [{key: '{{msg1}}', value: '{{msg}}', type: 'text', enabled: true},
                                {key: 'incollection', value: 'hello\\world', type: 'text', enabled: true}]
                        }
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
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests')).to.eql({
            'Form Key Replaced': true,
            'Form val replaced from env': true
        });
    });

    it('must have completed the run', function() {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
