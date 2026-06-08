var _ = require('lodash'),
    Instruction = require('./instruction'),
    Cursor = require('./cursor'),
    VariableScope = require('postman-collection').VariableScope,
    RequestCookieJar = require('postman-request').jar;

/**
 * Represents a single execution partition that can process a subset of iterations.
 * Each partition is responsible for executing a portion of the total iterations in a collection run.
 * Partitions enable concurrent execution of collection runs.
 */
class Partition {
    /**
     * Creates a new execution partition
     *
     * @param {Object} runInstance - The run instance this partition belongs to
     * @param {Number} startIteration - The starting iteration index
     * @param {Number} partitionSize - Size of this partition (number of iterations)
     * @param {Number} partitionIndex - Index of this partition within the partition manager
     */
    constructor (runInstance, startIteration, partitionSize, partitionIndex) {
        const { commands } = require('./run');

        this.runInstance = runInstance;
        this.pool = Instruction.pool(commands);
        this.variables = this._cloneVariables();
        this.cursor = this._createCursor(startIteration, partitionSize, partitionIndex);
        this.startIndex = startIteration;
        this.partitionIndex = partitionIndex;

        // Per-partition HTTP cookie jar, used when the run has
        // requester.perPartitionCookieJar enabled. Allocated by
        // getCookieJar() on the partition's first request or script (the
        // first Run#getCookieJarFor resolution), NOT on run start and NOT
        // gated on actual cookie traffic — any request/script triggers
        // allocation even if no cookie is ever sent. Reset by
        // stopSinglePartition when the partition is recycled. Unlike
        // `variables`, the jar is not cloned from run-level state — a
        // fresh partition is born with an empty jar.
        this.cookieJar = null;

        // Per-VU loop counter for customParallelIterations mode. Survives
        // across runSinglePartition calls and feeds cursor.iteration.
        // Reset by stopSinglePartition under the "full fresh on reuse"
        // contract. See agent/research/07-decisions.html D3/D8.
        this.loopIteration = 0;
        // Set by stopSinglePartition; consulted by updatePartitionVariables
        // to drop late writes from a script that was in flight at stop time
        // (otherwise the dead VU's mutations leak into the next VU's fresh
        // scope). Cleared in runSinglePartition before queueing new work.
        this.stopped = false;
    }

    /**
     * Clones variables from the run instance for this partition
     *
     * @returns {Object} Cloned variable scopes
     * @private
     */
    _cloneVariables () {
        if (!this.runInstance.state) {
            return {};
        }

        // clone the variables for the partition
        return {
            environment: new VariableScope(this.runInstance.state.environment),
            globals: new VariableScope(this.runInstance.state.globals),
            vaultSecrets: new VariableScope(this.runInstance.state.vaultSecrets),
            collectionVariables: new VariableScope(this.runInstance.state.collectionVariables),
            _variables: new VariableScope(this.runInstance.state._variables)
        };
    }

    /**
     * Lazily creates and returns this partition's cookie jar.
     *
     * Only meaningful when the run has requester.perPartitionCookieJar
     * enabled — callers resolve through Run#getCookieJarFor, which gates
     * on that option and falls back to the RequesterPool's shared default
     * jar otherwise.
     *
     * @returns {Object} a postman-request (tough-cookie) cookie jar
     */
    getCookieJar () {
        if (!this.cookieJar) {
            this.cookieJar = RequestCookieJar();
        }

        return this.cookieJar;
    }

    /**
     * Drops the jar; the next getCookieJar() allocates a fresh one.
     *
     * Called by stopSinglePartition when a partition is recycled — a
     * stopped partition's session cookies must not leak into the next
     * occupant of the reused index. In-flight requesters and script
     * cookie-bridge listeners capture the jar reference at
     * creation/registration time, so late Set-Cookie writes from a
     * stopped partition land in the OLD jar object (which is then
     * garbage collected) instead of polluting the recycled partition's
     * fresh jar — the stale reference is the guard.
     */
    resetCookieJar () {
        this.cookieJar = null;
    }

    /**
     * Re-clones variables from run-level state. Used by stopSinglePartition
     * to enforce the "full fresh on reuse" contract — when a partition is
     * recycled by removeUsers/addUsers, the next loop must see a clean
     * variables scope rather than inheriting the dead VU's mutations.
     */
    resetVariables () {
        this.variables = this._cloneVariables();
    }

    /**
     * Creates a cursor for this partition
     *
     * @param {Number} startIteration - The starting iteration index
     * @param {Number} partitionSize - Size of this partition
     * @param {Number} partitionIndex - Index of this partition
     * @returns {Object} Cursor object
     * @private
     */
    _createCursor (startIteration, partitionSize, partitionIndex) {
        return Cursor.box({
            length: _.get(this.runInstance, 'state.items.length', 0),
            // In customParallelIterations mode the loop count is unbounded
            // per VU (driven by perftest's duration, not iterationCount).
            // Raising cycles to MAX_SAFE_INTEGER lets us assign incremented
            // iteration values via direct write or cursor.seek without
            // tripping the "seeking out of bounds" guard in cursor.js.
            cycles: this.runInstance.isCustomParallelIterations ?
                Number.MAX_SAFE_INTEGER :
                _.get(this.runInstance, 'options.iterationCount', 0),
            partitionCycles: partitionSize,
            partitionIndex: partitionIndex,
            iteration: startIteration,
            position: 0
        });
    }

    /**
     * Schedules an instruction to be executed in this partition's pool
     *
     * @param {String} action - Action to be performed
     * @param {Object} payload - Payload for the instruction
     * @param {Array} args - Arguments for the instruction
     * @returns {Object} - The created instruction object
     */
    schedule (action, payload, args) {
        const instruction = this.pool.create(action, payload, args);

        this.pool.push(instruction);

        return instruction;
    }

    /**
     * Clears all pending instructions in this partition's pool
     */
    clearPool () {
        this.pool.clear();
    }

    /**
     * Gets the next instruction from the pool for processing
     *
     * @returns {Object|null} The next instruction or null if none exists
     */
    nextInstruction () {
        return this.pool.shift();
    }

    /**
     * Checks if the partition has any pending instructions to process
     *
     * @returns {Boolean} True if there are instructions in the pool
     */
    hasInstructions () {
        return this.pool._queue.length > 0;
    }
}

module.exports = Partition;
