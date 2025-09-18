var _ = require('lodash'),
    Instruction = require('./instruction'),
    Cursor = require('./cursor'),
    VariableScope = require('postman-collection').VariableScope;

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
            cycles: _.get(this.runInstance, 'options.iterationCount', 0),
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
