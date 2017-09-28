var expect = require('expect.js'),
    ReplayController = require('../../lib/runner/replay-controller');

describe('ReplayController', function () {
    describe('constructor', function () {
        it('must construct state if replayState is empty', function () {
            var replayController = new ReplayController();

            expect(replayController.count).to.be(0);
        });

        it('must construct state from replayState if present', function () {
            var run = {},
                replayController = new ReplayController({count: 1}, run);

            expect(replayController.count).to.be(1);
            expect(replayController.run).to.equal(run);
        });
    });

    describe('.getReplayState', function () {
        it('must return state always', function () {
            expect(new ReplayController().getReplayState()).to.eql({count: 0});
            expect(new ReplayController({count: 1}).getReplayState()).to.eql({count: 1});
        });
    });

    describe('.requestReplay', function () {
        // this handles retries exceeding max count
        // success cases are handled in integration tests
        it('should not send request and invoke failure callback', function () {
            var replayController = new ReplayController({count: 10}, {});

            replayController.requestReplay({}, {}, {}, function () {
                // we shouldn't be here
                expect(false).to.be(true);
            }, function () {
                // we should be here
                expect(true).to.be(true);
            });
        });
    });
});
