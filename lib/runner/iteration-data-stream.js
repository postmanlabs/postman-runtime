var _ = require('lodash'),

    IterationDataStream;

/**
 * A bounded, lazy source of iteration data.
 *
 * The collection runner is built around a known-length, index-addressable data
 * array. This wraps an async row stream (e.g. a dataset view) so the runner keeps
 * that contract without ever holding the whole result: the row count is known up
 * front (used as the iteration count) and rows are pulled through a small sliding
 * window, freed once the run has moved past them.
 *
 * Access must be forward-only, i.e. serial iterations. `ensure(i)` pulls until row
 * `i` is buffered and drops rows behind it; `getIterationRow(i)` then reads it
 * synchronously, mirroring `data[i]` for the array path.
 *
 * @constructor
 * @param {AsyncIterable} rows - lazy row source, one object per iteration
 * @param {Number} length - total row count, known up front
 * @param {Function} [cancel] - releases the underlying stream early
 */
IterationDataStream = function (rows, length, cancel) {
    this.length = length;
    this._iterator = rows[Symbol.asyncIterator]();
    this._cancel = cancel;
    this._rows = new Map(); // index -> row; holds only the live window
    this._nextIndex = 0; // next row index to pull from the stream
    this._lastRow = {}; // fallback when the run over-runs the stream
    this._done = false;
};

_.assign(IterationDataStream.prototype, {
    /**
     * Pull rows until `index` is buffered and evict everything before it.
     * Idempotent and cheap when the row is already in the window.
     *
     * @param {Number} index -
     * @returns {Promise} -
     */
    ensure (index) {
        var self = this;

        // drop rows the (forward-only) run has already passed
        self._rows.forEach(function (value, key) {
            if (key < index) { self._rows.delete(key); }
        });

        function pump () {
            if (self._done || self._nextIndex > index) {
                return Promise.resolve();
            }

            return self._iterator.next().then(function (step) {
                if (step.done) {
                    self._done = true;

                    return;
                }

                self._rows.set(self._nextIndex, step.value);
                self._lastRow = step.value;
                self._nextIndex += 1;

                return pump();
            });
        }

        return pump();
    },

    /**
     * Synchronously read the row for an iteration. Requires a prior `ensure`.
     *
     * @param {Number} index -
     * @returns {Object} -
     */
    getIterationRow (index) {
        if (this._rows.has(index)) {
            return this._rows.get(index);
        }

        // Over-run past the stream (e.g. iterationCount greater than the row
        // count): reuse the last row, matching the array path's data[length-1].
        return this._lastRow;
    },

    /**
     * Release the underlying stream.
     *
     * @returns {void} -
     */
    close () {
        // Idempotent: the run may terminate through more than one path, and
        // `_cancel` releases an engine cursor — double-releasing is a footgun.
        if (this._closed) { return; }
        this._closed = true;
        this._rows.clear();
        this._done = true;
        this._cancel && this._cancel();
    }
});

module.exports = IterationDataStream;
