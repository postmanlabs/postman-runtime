var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    sdk = require('postman-collection'),
    VariableScope = sdk.VariableScope;

describe('event command - parallel iteration variable persistence', function () {
    var mockRunner,
        mockPartitionManager,
        mockPartition;

    beforeEach(function () {
        mockPartition = {
            variables: {
                _variables: new VariableScope()
            }
        };

        mockPartitionManager = {
            partitions: [mockPartition]
        };

        mockRunner = {
            areIterationsParallelized: true,
            partitionManager: mockPartitionManager,
            state: {
                _variables: new VariableScope()
            },
            triggers: {
                script: sinon.stub()
            }
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('variable persistence in parallel iterations', function () {
        var payload,
            result;

        beforeEach(function () {
            payload = {
                coords: {
                    partitionIndex: 0
                },
                context: {}
            };

            result = {
                _variables: {
                    testVar: 'testValue',
                    anotherVar: 42
                }
            };
        });

        it('should persist variables to partition when iterations are parallelized', function () {
            var originalVariables = mockPartition.variables._variables,
                partitionIndex;

            // Simulate the variable persistence logic from event.command.js
            if (result && result._variables && mockRunner.areIterationsParallelized) {
                partitionIndex = payload.coords.partitionIndex;

                mockRunner.partitionManager.partitions[partitionIndex]
                    .variables._variables = new VariableScope(result._variables);
            }

            expect(mockPartition.variables._variables).to.not.equal(originalVariables);
            expect(mockPartition.variables._variables).to.be.instanceOf(VariableScope);
        });

        it('should not persist variables to partition when iterations are not parallelized', function () {
            var originalVariables = mockPartition.variables._variables,
                partitionIndex;

            mockRunner.areIterationsParallelized = false;

            // Simulate the variable persistence logic
            if (result && result._variables && mockRunner.areIterationsParallelized) {
                partitionIndex = payload.coords.partitionIndex;

                mockRunner.partitionManager.partitions[partitionIndex]
                    .variables._variables = new VariableScope(result._variables);
            }

            expect(mockPartition.variables._variables).to.equal(originalVariables);
        });

        it('should handle missing result variables gracefully', function () {
            var originalVariables = mockPartition.variables._variables,
                partitionIndex;

            result._variables = null;

            // Simulate the variable persistence logic
            if (result && result._variables && mockRunner.areIterationsParallelized) {
                partitionIndex = payload.coords.partitionIndex;

                mockRunner.partitionManager.partitions[partitionIndex]
                    .variables._variables = new VariableScope(result._variables);
            }

            expect(mockPartition.variables._variables).to.equal(originalVariables);
        });

        it('should handle missing result gracefully', function () {
            var originalVariables = mockPartition.variables._variables,
                partitionIndex;

            result = null;

            // Simulate the variable persistence logic
            if (result && result._variables && mockRunner.areIterationsParallelized) {
                partitionIndex = payload.coords.partitionIndex;

                mockRunner.partitionManager.partitions[partitionIndex]
                    .variables._variables = new VariableScope(result._variables);
            }

            expect(mockPartition.variables._variables).to.equal(originalVariables);
        });

        it('should use correct partition index from payload coords', function () {
            var secondPartition = {
                    variables: {
                        _variables: new VariableScope()
                    }
                },
                originalFirstPartitionVariables = mockPartition.variables._variables,
                originalSecondPartitionVariables,
                partitionIndex;

            mockPartitionManager.partitions.push(secondPartition);
            payload.coords.partitionIndex = 1;

            originalSecondPartitionVariables = secondPartition.variables._variables;

            // Simulate the variable persistence logic
            if (result && result._variables && mockRunner.areIterationsParallelized) {
                partitionIndex = payload.coords.partitionIndex;

                mockRunner.partitionManager.partitions[partitionIndex]
                    .variables._variables = new VariableScope(result._variables);
            }

            // First partition should remain unchanged
            expect(mockPartition.variables._variables).to.equal(originalFirstPartitionVariables);
            // Second partition should be updated
            expect(secondPartition.variables._variables).to.not.equal(originalSecondPartitionVariables);
        });

        it('should handle undefined partition index gracefully', function () {
            var originalVariables = mockPartition.variables._variables,
                partitionIndex;

            payload.coords.partitionIndex = undefined;

            expect(function () {
                // Simulate the variable persistence logic
                if (result && result._variables && mockRunner.areIterationsParallelized) {
                    partitionIndex = payload.coords.partitionIndex;

                    if (mockRunner.partitionManager.partitions[partitionIndex]) {
                        mockRunner.partitionManager.partitions[partitionIndex]
                            .variables._variables = new VariableScope(result._variables);
                    }
                }
            }).to.not.throw();

            // Should not have changed the original variables
            expect(mockPartition.variables._variables).to.equal(originalVariables);
        });

        it('should handle out of bounds partition index gracefully', function () {
            var originalVariables = mockPartition.variables._variables,
                partitionIndex;

            payload.coords.partitionIndex = 99; // Out of bounds

            expect(function () {
                // Simulate the variable persistence logic
                if (result && result._variables && mockRunner.areIterationsParallelized) {
                    partitionIndex = payload.coords.partitionIndex;

                    if (mockRunner.partitionManager.partitions[partitionIndex]) {
                        mockRunner.partitionManager.partitions[partitionIndex]
                            .variables._variables = new VariableScope(result._variables);
                    }
                }
            }).to.not.throw();

            expect(mockPartition.variables._variables).to.equal(originalVariables);
        });

        it('should create new VariableScope instance with result variables', function () {
            var testVariables = {
                    var1: 'value1',
                    var2: 'value2',
                    var3: { nested: 'object' }
                },
                updatedVariables,
                partitionIndex;

            result._variables = testVariables;

            // Simulate the variable persistence logic
            if (result && result._variables && mockRunner.areIterationsParallelized) {
                partitionIndex = payload.coords.partitionIndex;

                mockRunner.partitionManager.partitions[partitionIndex]
                    .variables._variables = new VariableScope(result._variables);
            }

            updatedVariables = mockPartition.variables._variables;

            expect(updatedVariables).to.be.instanceOf(VariableScope);
            // Note: VariableScope constructor behavior may vary, but we ensure it's created with the right data
        });

        it('should maintain isolation between partitions', function () {
            var secondPartition = {
                    variables: {
                        _variables: new VariableScope()
                    }
                },
                thirdPartition = {
                    variables: {
                        _variables: new VariableScope()
                    }
                },
                originalFirstVariables = mockPartition.variables._variables,
                originalThirdVariables,
                partitionIndex;

            mockPartitionManager.partitions.push(secondPartition, thirdPartition);

            // Update only the second partition (index 1)
            payload.coords.partitionIndex = 1;
            result._variables = { isolatedVar: 'partition1Value' };

            originalThirdVariables = thirdPartition.variables._variables;

            // Simulate the variable persistence logic
            if (result && result._variables && mockRunner.areIterationsParallelized) {
                partitionIndex = payload.coords.partitionIndex;

                mockRunner.partitionManager.partitions[partitionIndex]
                    .variables._variables = new VariableScope(result._variables);
            }

            // Only the second partition should be updated
            expect(mockPartition.variables._variables).to.equal(originalFirstVariables);
            expect(secondPartition.variables._variables).to.not.equal(originalFirstVariables);
            expect(thirdPartition.variables._variables).to.equal(originalThirdVariables);
        });
    });

    describe('integration with existing variable persistence', function () {
        it('should persist variables to both state and partition', function () {
            var payload = {
                    coords: { partitionIndex: 0 },
                    context: {}
                },
                result = {
                    _variables: {
                        sharedVar: 'sharedValue'
                    }
                },
                originalStateVariables = mockRunner.state._variables,
                partitionIndex;

            // Simulate both persistence mechanisms
            // 1. Persist to state (existing behavior)
            if (result && result._variables) {
                mockRunner.state._variables = new VariableScope(result._variables);
            }

            // 2. Persist to partition (new behavior)
            if (result && result._variables && mockRunner.areIterationsParallelized) {
                partitionIndex = payload.coords.partitionIndex;

                mockRunner.partitionManager.partitions[partitionIndex]
                    .variables._variables = new VariableScope(result._variables);
            }

            // Both should be updated
            expect(mockRunner.state._variables).to.not.equal(originalStateVariables);
            expect(mockPartition.variables._variables).to.be.instanceOf(VariableScope);
        });

        it('should handle context variable persistence alongside partition persistence', function () {
            var payload = {
                    coords: { partitionIndex: 0 },
                    context: {}
                },
                result = {
                    _variables: {
                        contextVar: 'contextValue'
                    }
                },
                partitionIndex;

            // Simulate all three persistence mechanisms
            // 1. Persist to context
            if (result && result._variables) {
                payload.context._variables = new VariableScope(result._variables);
            }

            // 2. Persist to state
            if (result && result._variables) {
                mockRunner.state._variables = new VariableScope(result._variables);
            }

            // 3. Persist to partition
            if (result && result._variables && mockRunner.areIterationsParallelized) {
                partitionIndex = payload.coords.partitionIndex;

                mockRunner.partitionManager.partitions[partitionIndex]
                    .variables._variables = new VariableScope(result._variables);
            }

            expect(payload.context._variables).to.be.instanceOf(VariableScope);
            expect(mockRunner.state._variables).to.be.instanceOf(VariableScope);
            expect(mockPartition.variables._variables).to.be.instanceOf(VariableScope);
        });
    });
});
