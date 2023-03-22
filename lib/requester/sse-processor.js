const bom = [239, 187, 191],
    colon = 58,
    lineFeed = 10,
    carriageReturn = 13,

    // Beyond 256KB we could not observe any gain in performance
    maxBufferAheadAllocation = 1024 * 256;


function hasBom (buf) {
    return bom.every((charCode, index) => {
        return buf[index] === charCode;
    });
}

// Adapted from https://github.com/EventSource/eventsource
class SSEProcessor {
    constructor (emit) {
        this.emit = emit;

        this.buf = undefined;
        this.newBuffer = undefined;
        this.startingPos = 0;
        this.startingFieldLength = -1;
        this.newBufferSize = 0;
        this.bytesUsed = 0;
        this.discardTrailingNewline = false;

        // Accumulates the event data util a new line is encountered
        this.eventBuffer = undefined;
    }

    onData (chunk) {
        if (!this.buf) {
            this.buf = chunk;
            if (hasBom(this.buf)) {
                this.buf = this.buf.slice(bom.length);
            }

            this.bytesUsed = this.buf.length;
        }
        else {
            if (chunk.length > this.buf.length - this.bytesUsed) {
                this.newBufferSize = (this.buf.length * 2) + chunk.length;

                if (this.newBufferSize > maxBufferAheadAllocation) {
                    this.newBufferSize = this.buf.length + chunk.length + maxBufferAheadAllocation;
                }

                this.newBuffer = Buffer.alloc(this.newBufferSize);
                this.buf.copy(this.newBuffer, 0, 0, this.bytesUsed);
                this.buf = this.newBuffer;
            }

            chunk.copy(this.buf, this.bytesUsed);
            this.bytesUsed += chunk.length;
        }

        let pos = 0,
            length = this.bytesUsed;

        while (pos < length) {
            if (this.discardTrailingNewline) {
                if (this.buf[pos] === lineFeed) {
                    ++pos;
                }

                this.discardTrailingNewline = false;
            }

            let lineLength = -1,
                fieldLength = this.startingFieldLength,
                c;

            for (let i = this.startingPos; lineLength < 0 && i < length; ++i) {
                c = this.buf[i];

                if (c === colon) {
                    if (fieldLength < 0) {
                        fieldLength = i - pos;
                    }
                }
                else if (c === carriageReturn) {
                    this.discardTrailingNewline = true;
                    lineLength = i - pos;
                }
                else if (c === lineFeed) {
                    lineLength = i - pos;
                }
            }

            if (lineLength < 0) {
                this.startingPos = length - pos;
                this.startingFieldLength = fieldLength;
                break;
            }
            else {
                this.startingPos = 0;
                this.startingFieldLength = -1;
            }

            // Dispatch event when a new line is encountered
            if (lineLength === 0) {
                this.eventBuffer = Buffer.from([...(this.eventBuffer || []), ...Buffer.from([lineFeed])]);

                this.emit(this.eventBuffer);
                this.eventBuffer = undefined;
            }
            else {
                const bufToCopy = this.buf.slice(pos, pos + lineLength + 1);

                this.eventBuffer = Buffer.from([...(this.eventBuffer || []), ...bufToCopy]);
            }

            pos += lineLength + 1;
        }

        if (pos === length) {
            this.buf = undefined;
            this.bytesUsed = 0;
        }
        else if (pos > 0) {
            this.buf = this.buf.slice(pos, this.bytesUsed);
            this.bytesUsed = this.buf.length;
        }
    }
}

module.exports = SSEProcessor;
