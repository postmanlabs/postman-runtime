/**
 * Fast UUID generator for internal use cases that don't require cryptographic randomness.
 * Uses a counter-based approach to avoid kernel syscalls from crypto.randomFillSync().
 *
 * Format: <timestamp>-<pid>-<counter>
 * This provides sufficient uniqueness for internal event namespacing and IDs.
 *
 * @module FastUUID
 * @private
 */

let _counter = 0n;
const _processId = (typeof process !== 'undefined' && process.pid) ? process.pid.toString(16) : '0',
    _timestampPrefix = Date.now().toString(16);

/**
 * Generates a fast, unique identifier without using cryptographic randomness.
 * Suitable for internal IDs like event namespacing, request IDs, etc.
 *
 * @returns {String} A unique identifier string
 */
function fastUUID () {
    const counter = (++_counter).toString(16);

    return `${_timestampPrefix}-${_processId}-${counter}`;
}

/**
 * Resets the counter (useful for testing).
 * @private
 */
function _reset () {
    _counter = 0n;
}

module.exports = fastUUID;
module.exports._reset = _reset;

