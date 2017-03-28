describe('Dynamic variable replacement', function () {
    var _ = require('lodash'),
        testrun;

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    event: [{
                        listen: 'test',
                        script: {
                            exec: ['var responseJSON;',
                                'try { responseJSON = JSON.parse(responseBody); }',
                                'catch (e) { console.log(e); }',
                                'tests["FriendlyName should be a GUID"] = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(responseJSON.form["FriendlyName"]);',
                                'tests["RandomId should be an integer"] = (_.parseInt(responseJSON.form["RandomId"]) % 1) === 0;',
                                'tests["TimeCreated should be an integer"] = (_.parseInt(responseJSON.form["TimeCreated"]) % 1) === 0;']
                        }
                    }],
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'urlencoded',
                            urlencoded: [{key: 'FriendlyName', value: '{{$guid}}', type: 'text', enabled: true},
                                {key: 'RandomId', value: '{{$randomInt}}', type: 'text', enabled: true},
                                {key: 'TimeCreated', value: '{{$timestamp}}', type: 'text', enabled: true}]
                        }
                    }
                }]
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have run the test script successfully', function () {
        expect(testrun).be.ok();
        expect(testrun.test.calledOnce).be.ok();

        expect(testrun.test.getCall(0).args[0]).to.be(null);
        expect(_.get(testrun.test.getCall(0).args[2], '0.result.globals.tests')).to.eql({
            'FriendlyName should be a GUID': true,
            'RandomId should be an integer': true,
            'TimeCreated should be an integer': true
        });
    });

    it('must have completed the run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.done.getCall(0).args[0]).to.be(null);
        expect(testrun.start.calledOnce).be.ok();
    });
});
