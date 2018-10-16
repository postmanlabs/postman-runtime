var expect = require('chai').expect,
    ReplayController = require('../../lib/runner/replay-controller');

describe('ReplayController', function () {
    describe('constructor', function () {
        it('should construct state if replayState is empty', function () {
            var replayController = new ReplayController();

            expect(replayController.count).to.equal(0);
        });

        it('should construct state from replayState if present', function () {
            var run = {},
                replayController = new ReplayController({count: 1}, run);

            expect(replayController).to.deep.include({
                count: 1,
                run: run
            });
        });
    });

    describe('.getReplayState', function () {
        it('should return state always', function () {
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
                expect(false).to.be.true;
            }, function () {
                // we should be here
                expect(true).to.be.true;
            });
        });
    });
});
