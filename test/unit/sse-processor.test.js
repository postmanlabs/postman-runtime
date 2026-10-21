var expect = require('chai').expect,
    SSEProcessor = require('../../lib/requester/sse-processor');

describe('SSEProcessor', function () {
    /**
     * Feeds the given chunks to a new processor and returns the emitted events as strings.
     *
     * @param {Array<String|Buffer>} chunks -
     * @returns {Array<String>}
     */
    function process (chunks) {
        var events = [],
            processor = new SSEProcessor(function (event) {
                events.push(event.toString());
            });

        chunks.forEach(function (chunk) {
            processor.onData(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        return events;
    }

    it('should emit an event for each empty line', function () {
        expect(process(['data: one\n\ndata: two\nid: 2\n\n'])).to.eql([
            'data: one\n\n',
            'data: two\nid: 2\n\n'
        ]);
    });

    it('should not emit an event until the empty line is received', function () {
        expect(process(['data: one\ndata: two\n'])).to.eql([]);
    });

    it('should handle events split across chunks', function () {
        expect(process(['da', 'ta: o', 'ne\ndata', ': two\n', '\n'])).to.eql([
            'data: one\ndata: two\n\n'
        ]);
    });

    it('should strip a leading byte order mark', function () {
        expect(process([Buffer.concat([Buffer.from([239, 187, 191]), Buffer.from('data: one\n\n')])]))
            .to.eql(['data: one\n\n']);
    });

    it('should handle CRLF and CR line endings', function () {
        expect(process(['data: one\r\n\r\ndata: two\r\rdata: three\r', '\n\r\n'])).to.eql([
            'data: one\r\n',
            'data: two\r\n',
            'data: three\r\n'
        ]);
    });

    it('should not treat a CR in an earlier line as the end of a later line', function () {
        expect(process(['data: one\r\ndata: two\n\ndata: three\n\n'])).to.eql([
            'data: one\rdata: two\n\n',
            'data: three\n\n'
        ]);
    });

    it('should emit events that do not share memory with the input chunk', function () {
        var chunk = Buffer.from('data: one\n\n'),
            events = [],
            processor = new SSEProcessor(function (event) { events.push(event); });

        processor.onData(chunk);
        chunk.fill(0);

        expect(events[0].toString()).to.equal('data: one\n\n');
    });

    it('should process an event with many lines in linear time', function () {
        this.timeout(10000);

        var lines = 200000,
            line = 'data: x\n',
            chunkSize = 64 * 1024,
            payload = Buffer.from(line.repeat(lines) + '\n'),
            events = [],
            processor = new SSEProcessor(function (event) { events.push(event); }),
            start = Date.now(),
            i;

        for (i = 0; i < payload.length; i += chunkSize) {
            processor.onData(payload.subarray(i, i + chunkSize));
        }

        expect(events).to.have.lengthOf(1);
        expect(events[0]).to.have.lengthOf(payload.length);
        expect(Date.now() - start).to.be.below(2000);
    });
});
