var Partition = require('./partition');
var sdk = require('postman-collection');


class PartitionManager {
    constructor (runInstance) {
        this.runInstance = runInstance;
    }

    spawn () {
        this.partitions = [];
        this.stopActionTriggered = false;

        // we need at least one pool to start with.
        // this is the pool that will be used to process the control instruction
        // before we start partitioning (for abort, etc)
        this.priorityPartition = this._getSinglePartition();
    }

    createPartitions () {
        this.options = this.runInstance.options;
        this.state = this.runInstance.state;
        this.processingPriority = false;
        this.priorityLock = false;
        let { iterationCount, maxConcurrency } = this.options,
            concurrency = maxConcurrency || 1,
            cyclesPerPartition = Math.floor(iterationCount / concurrency),
            remainingCycles = iterationCount % concurrency,
            startIteration = 0; // the iteration that this partition will start with.

        if (concurrency > iterationCount) {
            concurrency = iterationCount;
        }
        // make sure we are starting afresh
        this.reset();

        // if customParallelIterations is true, then do not create partitions by default
        if (this.options?.customParallelIterations) {
            return;
        }

        for (let i = 0; i < concurrency; i++) {
            let partitionSize = cyclesPerPartition + (i < remainingCycles ? 1 : 0);

            if (partitionSize <= 0) { continue; }
            // create a partition for each concurrency
            this.partitions.push(this._getSinglePartition(startIteration, partitionSize, i));
            startIteration += partitionSize;
        }
    }

    _getSinglePartition (startIteration = 0, partitionSize = 1, partitionIndex = 0) {
        return new Partition(this.runInstance, startIteration, partitionSize, partitionIndex);
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

        if (action === 'abort' && this.options?.customParallelIterations) {
            // eslint-disable-next-line
            const instructions = this.partitions.filter((partition) => partition.hasInstructions());

            // when no partition has any instructions, then we can trigger the done trigger immediately
            if (instructions.length === 0) {
                this.triggerStopAction();
            }
        }

        if (immediate) {
            return this.priorityPartition.schedule(action, payload, args);
        }

        return this.partitions[partitionIndex].schedule(action, payload, args);
    }

    _processPartition (partition, done) {
        // If we're already processing priority items elsewhere, wait
        if (this.priorityLock && partition !== this.priorityPartition) {
            // Use setTimeout to recheck later without blocking
            return setTimeout(() => {
                this._processPartition(partition, done);
            }, 10);
        }

        // Check if priority partition has items and we're not already processing it
        if (this.priorityPartition &&
            this.priorityPartition.hasInstructions() &&
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
        var instruction = partition.nextInstruction();

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

            // If run has been aborted, complete immediately
            if (this.runInstance.aborted) {
                completed = true;
                this.runInstance.host && this.runInstance.host.dispose();

                return callback(null);
            }

            if (err) {
                completed = true;

                return callback(err);
            }

            remainingPools--;
            if (remainingPools === 0) {
                completed = true;
                this.runInstance.host && this.runInstance.host.dispose();

                return callback(null);
            }
        };

        // First check if priority partition has items
        if (this.priorityPartition && this.priorityPartition.hasInstructions()) {
            // If yes, set the lock and process it first
            this.priorityLock = true;
            this._processPartition(this.priorityPartition, (err) => {
                this.priorityLock = false;

                if (err) {
                    return callback(err, this.state.cursor.current());
                }
                // if custom parallel iterations is true, then do not process other partitions
                if (!this.options.customParallelIterations) {
                    // After priority is done, start processing other partitions
                    for (let i = 0; i < this.partitions.length; i++) {
                        this._processPartition(this.partitions[i], poolFinished);
                    }
                }
            });
        }
        else if (!this.options.customParallelIterations) {
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
    dispose () {
        this.partitions.forEach((partition) => {
            partition.clearPool();
        });

        this.triggerStopAction();
    }


    /**
     * Creates a single partition
     * @param {Number} index - The index of the partition to create
     * @returns {Partition}
     */
    createSinglePartition (index) {
        const START_ITERATION = 0,
            PARTITION_SIZE = 1,
            partition = this._getSinglePartition(START_ITERATION, PARTITION_SIZE, index);

        this.partitions.push(partition);

        return partition;
    }


    /**
     * Runs a single iteration
     * @param {Number} index - The index of the partition to run
     * @param {Object} localVariables - Local variables for the iteration
     * @param {Function} callback - The callback to call when the iteration is complete
     */
    runSinglePartition (index, localVariables, callback) {
        let partition;

        // if the partition exists, use it, else create a new one
        if (this.partitions[index]) {
            partition = this.partitions[index];

            // if partition is already has instructions donot do anything
            if (partition.hasInstructions()) {
                return callback(null);
            }
        }
        else {
            partition = this.createSinglePartition(index);
        }

        // Always use iteration 0 since we only have 1 iteration of data.
        // and start from the 0th request position.
        partition.cursor.seek(0, 0);
        if (localVariables) {
            partition.variables._variables = localVariables;
        }

        this.runInstance.queue('parallel', {
            coords: partition.cursor.current(),
            static: true,
            start: true
        });

        this._processPartition(partition, callback);
    }

    /**
     * Stops a single iteration
     * @param {Number} index - The index of the partition to stop
     * @param {Function} callback - The callback to call when the iteration is complete
     */
    stopSinglePartition (index, callback) {
        const partition = this.partitions[index];

        if (partition) {
            partition.clearPool();
        }


        return callback ? callback(null) : null;
    }

    /**
     * Stops all iterations
     */
    triggerStopAction () {
        if (this.stopActionTriggered) {
            return; // Prevent multiple calls
        }

        if (this.options && this.options.customParallelIterations && this.runInstance.triggers) {
            this.stopActionTriggered = true;
            this.runInstance.triggers(null);
        }
    }

    /**
     * Updates the variables for a specific partition
     * Used to persist pm.variables for the next request in the current iteration
     * when iterations are parallelized
     *
     * @param {Number} partitionIndex - The index of the partition to update
     * @param {Object} result - The variables to update
     */
    updatePartitionVariables (partitionIndex, result) {
        if (this.partitions[partitionIndex] && result && result._variables) {
            this.partitions[partitionIndex].variables._variables = new sdk.VariableScope(result._variables);
        }
    }
}

module.exports = PartitionManager;

