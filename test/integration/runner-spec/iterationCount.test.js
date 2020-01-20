var collection = {
    item: [{
        event: [{
            listen: 'prerequest',
            script: {
                exec: `
                    pm.test('should contain data', function () {
                        pm.expect(pm.iterationData.get('foo')).to.equal('bar');
                    });
                `
            }
        }],
        request: {
            url: 'https://postman-echo.com/get',
            method: 'GET'
        }
    }]
};

describe('Run option iterationCount', function () {
    describe('when set', function () {
        describe('without data', function () {
            var testrun;

            before(function (done) {
                this.run({
                    iterationCount: 3,
                    collection
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.not.exist;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should run collection specified number of times', function () {
                expect(testrun.request.callCount).to.equal(3);
            });
        });

        describe('with data items lesser than iteration count', function () {
            var testrun;

            before(function (done) {
                this.run({
                    iterationCount: 4,
                    data: [
                        {foo: 'bar'},
                        undefined,
                        {foo: 'bar'}
                    ],
                    collection
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.not.exist;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should run collection specified number of times', function () {
                expect(testrun.request.callCount).to.equal(4);
            });

            it('should use last data value for iterations with no corresponding data', function () {
                var assertions = [
                    testrun.assertion.getCall(0).args[1][0],
                    testrun.assertion.getCall(1).args[1][0],
                    testrun.assertion.getCall(2).args[1][0],
                    testrun.assertion.getCall(3).args[1][0]
                ];

                expect(assertions[0]).to.deep.include({
                    name: 'should contain data',
                    passed: true
                });
                expect(assertions[1]).to.deep.include({
                    name: 'should contain data',
                    passed: false
                });
                expect(assertions[2]).to.deep.include({
                    name: 'should contain data',
                    passed: true
                });
                expect(assertions[3]).to.deep.include({
                    name: 'should contain data',
                    passed: true
                });
            });
        });

        describe('with data items more than iteration count', function () {
            var testrun;

            before(function (done) {
                this.run({
                    iterationCount: 2,
                    data: [
                        {foo: 'bar'},
                        {foo: 'not bar'},
                        {foo: 'bar'}
                    ],
                    collection
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.not.exist;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should run collection specified number of times', function () {
                expect(testrun.request.callCount).to.equal(2);
            });

            it('should ignore the data items after the iteration count', function () {
                var assertions = [
                    testrun.assertion.getCall(0).args[1][0],
                    testrun.assertion.getCall(1).args[1][0]
                ];

                expect(assertions[0]).to.deep.include({
                    name: 'should contain data',
                    passed: true
                });
                expect(assertions[1]).to.deep.include({
                    name: 'should contain data',
                    passed: false
                });
            });
        });
    });

    describe('when not set', function () {
        describe('with data', function () {
            var testrun;

            before(function (done) {
                this.run({
                    data: [
                        {foo: 'bar'},
                        {foo: 'not bar'},
                        {foo: 'bar'}
                    ],
                    collection
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.not.exist;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should run iterations equal to the length of data', function () {
                expect(testrun.assertion.callCount).to.equal(3);
            });

            it('should use proper data elements for each iteration', function () {
                var assertions = [
                    testrun.assertion.getCall(0).args[1][0],
                    testrun.assertion.getCall(1).args[1][0],
                    testrun.assertion.getCall(2).args[1][0]
                ];

                expect(assertions[0]).to.deep.include({
                    name: 'should contain data',
                    passed: true
                });
                expect(assertions[1]).to.deep.include({
                    name: 'should contain data',
                    passed: false
                });
                expect(assertions[2]).to.deep.include({
                    name: 'should contain data',
                    passed: true
                });
            });
        });

        describe('without data', function () {
            var testrun;

            before(function (done) {
                this.run({
                    collection
                }, function (err, results) {
                    testrun = results;
                    done(err);
                });
            });

            it('should complete the run successfully', function () {
                expect(testrun).to.be.ok;
                expect(testrun.done.getCall(0).args[0]).to.not.exist;
                expect(testrun).to.nested.include({
                    'done.calledOnce': true,
                    'start.calledOnce': true
                });
            });

            it('should run only 1 iteration', function () {
                expect(testrun.assertion.callCount).to.equal(1);

                var assertion = testrun.assertion.getCall(0).args[1][0];

                expect(assertion).to.deep.include({
                    name: 'should contain data',
                    passed: false
                });
            });
        });
    });
});
