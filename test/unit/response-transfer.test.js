var expect = require('chai').expect,

    responseTransfer = require('../../lib/runner/response-transfer');

describe('response transfer', function () {
    var script = { isEmpty () { return false; } },
        emptyScript = { isEmpty () { return true; } },

        body = function () { return Buffer.from('body'); };

    describe('shouldKeepStream', function () {
        it('should keep the stream when the option is on and the host supports it', function () {
            expect(responseTransfer.shouldKeepStream({
                options: { script: { transferResponseBody: true } },
                host: { supportsTransferResponseBody: true }
            })).to.be.true;
        });

        it('should not keep the stream when the option is off', function () {
            expect(responseTransfer.shouldKeepStream({
                options: {},
                host: { supportsTransferResponseBody: true }
            })).to.be.false;
        });

        it('should not keep the stream when the host cannot transfer it', function () {
            expect(responseTransfer.shouldKeepStream({
                options: { script: { transferResponseBody: true } },
                host: {}
            })).to.be.false;
        });
    });

    describe('prepare', function () {
        it('should leave a base64 stream alone, as when the option is off', function () {
            var stream = { type: 'Base64', data: 'Ym9keQ==' },
                context = { response: { stream } },
                event = { script };

            // events is not a real list: reaching it would throw
            expect(responseTransfer.prepare(context, null, event, false)).to.be.false;
            expect(context.response.stream).to.equal(stream);
        });

        it('should hand the body itself to the last script', function () {
            var stream = body(),
                context = { response: { stream } },
                first = { script },
                last = { script },
                trailingEmpty = { script: emptyScript };

            expect(responseTransfer.prepare(context, [first, last, trailingEmpty], last, false)).to.be.true;
            expect(context.response.stream).to.equal(stream);
        });

        it('should hand a copy to a script that is not the last', function () {
            var stream = body(),
                code = 200,
                response = { code, stream },
                context = { response },
                first = { script },
                last = { script };

            expect(responseTransfer.prepare(context, [first, last], first, false)).to.be.true;
            expect(context.response).to.not.equal(response);
            expect(context.response.code).to.equal(200);
            expect(context.response.stream).to.not.equal(stream);
            expect(context.response.stream.equals(stream)).to.be.true;
            expect(response.stream).to.equal(stream);
        });

        it('should hand a copy to the last script of a nested run', function () {
            var stream = body(),
                context = { response: { stream } },
                only = { script };

            expect(responseTransfer.prepare(context, [only], only, true)).to.be.true;
            expect(context.response.stream).to.not.equal(stream);
            expect(context.response.stream.equals(stream)).to.be.true;
        });
    });
});
