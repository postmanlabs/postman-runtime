var Cursor = require('./cursor'),
    VariableScope = require('postman-collection').VariableScope,
    Instruction = require('./instruction');


class PartitionManager {
    constructor () {
        this.partitions = [];
        this.completedPartitions = [];
        this.priorityPartition = this._getSinglePartition();
        // we need at least one pool to start with. this is the pool that will be used to process the instructions
        // before we start partitioning (for abort, etc)
    }

    abortRequested () {
        this.abortRequested = true;
    }

    createPartitions (runInstance) {
        this.runInstance = runInstance;
        this.options = runInstance.options;
        this.state = runInstance.state;
        this.processingPriority = false;
        this.priorityLock = false;
        let { iterationCount, maxConcurrency } = this.options,
            concurrency = maxConcurrency || 1,
            cyclesPerPartition = Math.floor(iterationCount / concurrency),
            remainingCycles = iterationCount % concurrency,
            startPosition = 0;

        if (concurrency > iterationCount) {
            concurrency = iterationCount;
        }
        // make sure we are starting afresh
        this.reset();

        for (let i = 0; i < concurrency; i++) {
            let partitionSize = cyclesPerPartition + (i < remainingCycles ? 1 : 0);

            if (partitionSize <= 0) { continue; }
            // create a partition for each concurrency
            this.partitions.push(this._getSinglePartition(startPosition, partitionSize));
            startPosition += partitionSize;
        }
    }

    _getSinglePartition (startPosition = 0, partitionSize = 1) {
        var Run = require('./run'),
            pool = Instruction.pool(Run.commands),
            variables = this._cloneVariablesForPartition(),
            cursor = Cursor.box({
                length: this.state?.items?.length || 0,
                cycles: partitionSize,
                iteration: 0,
                position: 0
            });

        return {
            pool: pool,
            cursor: cursor,
            variables: variables,
            startIndex: startPosition,
            endIndex: startPosition + partitionSize - 1
        };
    }

    _cloneVariablesForPartition () {
        if (!this.state) {
            return {};
        }

        // clone the variables for the partition
        return {
            environment: new VariableScope(this.state.environment),
            globals: new VariableScope(this.state.globals),
            vaultSecrets: new VariableScope(this.state.vaultSecrets),
            collectionVariables: new VariableScope(this.state.collectionVariables),
            _variables: new VariableScope(this.state._variables)
        };
    }

    /**
     * @private
     *
     * @param {String} action -
     * @param {Object} [payload] -
     * @param {Array} [args] -
     * @param {Boolean} [immediate] -
     */
    schedule (action, payload, args, immediate) {
        const coords = payload?.coords || payload?.cursor,
            partitionIndex = coords?.partitionIndex;
        // if the partition index is not set, we are in the priority partition.

        if (immediate) {
            const pool = this.priorityPartition.pool,
                instruction = pool.create(action, payload, args);

            pool.push(instruction);

            return instruction;
        }

        // eslint-disable-next-line one-var
        const pool = this.partitions[partitionIndex].pool,
            instruction = pool.create(action, payload, args);

        // based on whether the immediate flag is set, add to the top or bottom of the instruction queue.
        pool.push(instruction);

        return instruction;
    }

    _processPartition (partition, done) {
        // If we're already processing priority items elsewhere, wait
        if (this.priorityLock && partition !== this.priorityPartition) {
            // Use setTimeout to recheck later without blocking
            return setTimeout(() => {
                this._processPartition(partition, done);
            }, 100);
        }

        // Check if priority partition has items and we're not already processing it
        if (this.priorityPartition &&
            this.priorityPartition.pool._queue.length > 0 &&
            partition !== this.priorityPartition &&
            !this.processingPriority) {
            // Set flag that we're processing priority items
            this.processingPriority = true;
            this.priorityLock = true;

            return this._processPartition(this.priorityPartition, (err) => {
            // Reset flag when done with priority items
                this.processingPriority = false;
                this.priorityLock = false;

                if (err) {
                    return done(err);
                }

                // Continue with original partition
                return this._processPartition(partition, done);
            });
        }

        // Regular processing logic
        var instruction = partition.pool.shift();

        if (!instruction) {
            return done();
        }

        instruction.execute((err) => {
            return err ? done(err) : this._processPartition(partition, done);
        }, this.runInstance);
    }

    process (callback) {
        if (this.runInstance.aborted) {
            return callback();
        }

        let remainingPools = this.partitions.length,
            completed = false;

        const poolFinished = (err) => {
            if (completed) {
                return;
            }

            if (err) {
                completed = true;

                return callback(err, this.state.cursor.current());
            }

            remainingPools--;
            if (remainingPools === 0) {
                completed = true;
                this.runInstance.host && this.runInstance.host.dispose();

                return callback(null, this.state.cursor.current());
            }
        };

        // First check if priority partition has items
        if (this.priorityPartition && this.priorityPartition.pool._queue.length > 0) {
            // If yes, set the lock and process it first
            this.priorityLock = true;
            this._processPartition(this.priorityPartition, (err) => {
                this.priorityLock = false;

                if (err) {
                    return callback(err, this.state.cursor.current());
                }

                // After priority is done, start processing other partitions
                for (let i = 0; i < this.partitions.length; i++) {
                    this._processPartition(this.partitions[i], poolFinished);
                }
            });
        }
        else {
            // If no priority items initially, start all partitions
            for (let i = 0; i < this.partitions.length; i++) {
                this._processPartition(this.partitions[i], poolFinished);
            }
        }
    }

    /**
     * Resets all partitions state
     */
    reset () {
        this.completedPartitions = 0;
        this.partitions = [];
    }

    /**
     * Gets the total number of partitions
     *
     * @returns {Number} Total partition count
     */
    getTotalPartitions () {
        return this.partitions.length;
    }

    /**
     * Clears all partition pools.
     */
    clearPools () {
        this.partitions.forEach((partition) => {
            partition.pool.clear();
        });
    }
}

module.exports = PartitionManager;

