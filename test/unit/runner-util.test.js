var sinon = require('sinon').createSandbox(),
    expect = require('chai').expect,
    runnerUtil = require('../../lib/runner/util');

describe('runner util', function () {
    after(function () {
        sinon.restore();
    });

    describe('.safeCall', function () {
        it('should not throw an error if a non function is passed', function () {
            var err = runnerUtil.safeCall('not a function');

            expect(err).to.be.undefined;
        });

        it('should pass arguments correctly', function () {
            var err,
                call,
                func = sinon.spy();

            err = runnerUtil.safeCall(func, { alpha: 'foo' }, 'bar', 'baz');

            expect(err).to.be.undefined;
            expect(func.calledOnce).to.be.true;

            call = func.getCall(0);
            expect(call).to.deep.include({
                thisValue: { alpha: 'foo' },
                args: ['bar', 'baz']
            });
        });

        it('should pass a default global context correctly', function () {
            var err,
                call,
                func = sinon.spy();

            err = runnerUtil.safeCall(func);

            expect(err).to.be.undefined;
            expect(func.calledOnce).to.be.true;

            call = func.getCall(0);
            expect(call).to.deep.include({
                thisValue: global,
                args: []
            });
        });

        it('should correctly handle functions that throw errors', function () {
            var err,
                call,
                func = sinon.stub().throws();

            err = runnerUtil.safeCall(func);

            expect(err).to.be.ok;
            expect(func.calledOnce).to.be.true;

            call = func.getCall(0);
            expect(call).to.deep.include({
                thisValue: global,
                args: []
            });
        });
    });

    describe('.syncObject', function () {
        it('should synchronize the provided objects correctly', function () {
            var target = { delta: 4 },
                source = { alpha: 0, beta: 2, gamma: 3 };

            runnerUtil.syncObject(target, source);
            expect(target).to.eql(source);
        });
    });

    describe('.prepareVariablesScope', function () {
        var VariableScope = require('postman-collection').VariableScope;

        it('should convert plain objects to VariableScope instances', function () {
            var state = {
                environment: { env: 'value' },
                globals: { global: 'value' },
                collectionVariables: { collection: 'value' },
                vaultSecrets: { vault: 'secret' },
                localVariables: { local: 'value' }
            };

            runnerUtil.prepareVariablesScope(state);

            expect(state.environment).to.be.instanceOf(VariableScope);
            expect(state.globals).to.be.instanceOf(VariableScope);
            expect(state.collectionVariables).to.be.instanceOf(VariableScope);
            expect(state.vaultSecrets).to.be.instanceOf(VariableScope);
            expect(state._variables).to.be.instanceOf(VariableScope);
        });

        it('should preserve existing VariableScope instances', function () {
            var existingScope = new VariableScope({ existing: 'value' }),
                state = {
                    environment: existingScope,
                    globals: { global: 'value' },
                    collectionVariables: { collection: 'value' },
                    vaultSecrets: { vault: 'secret' },
                    localVariables: { local: 'value' }
                };

            runnerUtil.prepareVariablesScope(state);

            expect(state.environment).to.equal(existingScope);
            expect(state.globals).to.be.instanceOf(VariableScope);
        });

        it('should handle undefined or null values', function () {
            var state = {
                environment: null,
                globals: undefined,
                collectionVariables: {},
                vaultSecrets: {},
                localVariables: {}
            };

            runnerUtil.prepareVariablesScope(state);

            expect(state.environment).to.be.instanceOf(VariableScope);
            expect(state.globals).to.be.instanceOf(VariableScope);
            expect(state._variables).to.be.instanceOf(VariableScope);
        });
    });

    describe('.getIterationData', function () {
        it('should return data for the specified iteration', function () {
            var data = [
                    { iteration: 0, value: 'first' },
                    { iteration: 1, value: 'second' },
                    { iteration: 2, value: 'third' }
                ],
                result = runnerUtil.getIterationData(data, 1);

            expect(result).to.equal(data[1]);
        });

        it('should return last data element when iteration exceeds array length', function () {
            var data = [
                    { iteration: 0, value: 'first' },
                    { iteration: 1, value: 'second' }
                ],
                result = runnerUtil.getIterationData(data, 5);

            expect(result).to.equal(data[1]);
        });

        it('should handle empty data array', function () {
            var data = [],
                result = runnerUtil.getIterationData(data, 0);

            expect(result).to.be.undefined;
        });

        it('should handle single element data array', function () {
            var data = [{ single: 'value' }],
                result = runnerUtil.getIterationData(data, 10);

            expect(result).to.equal(data[0]);
        });
    });

    describe('.pullDatasetBatch', function () {
        // serves one `pull` of a streamed pm.datasets result
        function rowSource (count) {
            return (async function *() {
                for (var i = 0; i < count; i++) { yield { id: i }; }
            }());
        }

        it('should stop at the limit and report the stream as open', function () {
            return runnerUtil.pullDatasetBatch(rowSource(10), 4).then(function (frame) {
                expect(frame.done).to.be.false;
                expect(frame.rows).to.eql([{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]);
            });
        });

        it('should serve successive batches from the same iterator', function () {
            var iterator = rowSource(5)[Symbol.asyncIterator]();

            return runnerUtil.pullDatasetBatch(iterator, 3).then(function (frame) {
                expect(frame).to.eql({ rows: [{ id: 0 }, { id: 1 }, { id: 2 }], done: false });

                return runnerUtil.pullDatasetBatch(iterator, 3);
            }).then(function (frame) {
                // ran out inside the batch, so the short tail is reported as done
                expect(frame).to.eql({ rows: [{ id: 3 }, { id: 4 }], done: true });
            });
        });

        it('should report done with the rows read so far when the source runs out', function () {
            return runnerUtil.pullDatasetBatch(rowSource(2), 10).then(function (frame) {
                expect(frame.done).to.be.true;
                expect(frame.rows).to.eql([{ id: 0 }, { id: 1 }]);
            });
        });

        it('should report done with no rows for an empty source', function () {
            return runnerUtil.pullDatasetBatch(rowSource(0), 10).then(function (frame) {
                expect(frame).to.eql({ rows: [], done: true });
            });
        });

        it('should reject when the source throws mid-batch', function () {
            var source = (async function *() {
                yield { id: 0 };
                throw new Error('engine cursor died');
            }());

            return runnerUtil.pullDatasetBatch(source, 10).then(function () {
                throw new Error('expected the batch to reject');
            }, function (err) {
                expect(err).to.be.an('error');
                expect(err.message).to.equal('engine cursor died');
            });
        });
    });

    describe('.processExecutionResult', function () {
        var mockOptions;

        beforeEach(function () {
            mockOptions = {
                coords: { position: 1, iteration: 0, length: 5 },
                executions: {
                    prerequest: [],
                    test: []
                },
                executionError: null,
                runnerOptions: {
                    disableSNR: false,
                    stopOnFailure: false
                },
                snrHash: null,
                items: [
                    { id: 'item1', name: 'First Item' },
                    { id: 'item2', name: 'Second Item' },
                    { id: 'item3', name: 'Third Item' }
                ]
            };
        });

        it('should return next coordinates without SNR', function () {
            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.nextCoords).to.deep.include({
                position: 1,
                iteration: 0,
                length: 5
            });
            expect(result.seekingToStart).to.be.undefined;
            expect(result.stopRunNow).to.be.undefined;
        });

        it('should handle SNR by item ID', function () {
            mockOptions.executions.test = [{
                result: {
                    return: { nextRequest: 'item2' }
                }
            }];

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.nextCoords.position).to.equal(0); // position 1 - 1 = 0
            expect(result.seekingToStart).to.be.undefined;
        });

        it('should handle SNR by item name', function () {
            mockOptions.executions.test = [{
                result: {
                    return: { nextRequest: 'Third Item' }
                }
            }];

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.nextCoords.position).to.equal(1); // position 2 - 1 = 1
        });

        it('should handle null SNR (stop iteration)', function () {
            mockOptions.executions.test = [{
                result: {
                    return: { nextRequest: null }
                }
            }];

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.nextCoords.position).to.equal(4); // length - 1
        });

        it('should handle invalid SNR gracefully', function () {
            mockOptions.executions.test = [{
                result: {
                    return: { nextRequest: 'nonexistent-item' }
                }
            }];

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.nextCoords.position).to.equal(4); // length - 1 (stop iteration)
        });

        it('should handle execution errors', function () {
            mockOptions.executionError = new Error('Test error');

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.nextCoords.position).to.equal(4); // length - 1 (stop iteration)
        });

        it('should set stopRunNow on execution error with stopOnFailure', function () {
            mockOptions.executionError = new Error('Test error');
            mockOptions.runnerOptions.stopOnFailure = true;

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.stopRunNow).to.be.true;
        });

        it('should handle position -1 by setting seekingToStart', function () {
            mockOptions.coords.position = 0;
            mockOptions.executions.test = [{
                result: {
                    return: { nextRequest: 'item1' }
                }
            }];

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.nextCoords.position).to.equal(0);
            expect(result.seekingToStart).to.be.true;
        });

        it('should skip SNR processing when disabled', function () {
            mockOptions.runnerOptions.disableSNR = true;
            mockOptions.executions.test = [{
                result: {
                    return: { nextRequest: 'item2' }
                }
            }];

            var result = runnerUtil.processExecutionResult(mockOptions);

            // When SNR is disabled but nextRequest is defined, it still stops the iteration
            expect(result.nextCoords.position).to.equal(4); // length - 1
        });

        it('should create and return SNR hash', function () {
            mockOptions.executions.test = [{
                result: {
                    return: { nextRequest: 'item2' }
                }
            }];

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.snrHash).to.be.an('object');
            expect(result.snrHash.ids).to.have.property('item2', 1);
            expect(result.snrHash.names).to.have.property('Second Item', 1);
        });

        it('should use existing SNR hash when provided', function () {
            var existingHash = {
                    ids: { item2: 1 },
                    names: { 'Second Item': 1 },
                    obj: {}
                },
                result;

            mockOptions.snrHash = existingHash;
            mockOptions.executions.test = [{
                result: {
                    return: { nextRequest: 'item2' }
                }
            }];

            result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.snrHash).to.equal(existingHash);
        });

        it('should extract SNR from prerequest executions', function () {
            mockOptions.executions.prerequest = [{
                result: {
                    return: { nextRequest: 'item3' }
                }
            }];

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.nextCoords.position).to.equal(1); // position 2 - 1 = 1
        });

        it('should prioritize test SNR over prerequest SNR', function () {
            mockOptions.executions.prerequest = [{
                result: {
                    return: { nextRequest: 'item2' }
                }
            }];
            mockOptions.executions.test = [{
                result: {
                    return: { nextRequest: 'item3' }
                }
            }];

            var result = runnerUtil.processExecutionResult(mockOptions);

            expect(result.nextCoords.position).to.equal(1); // item3 position - 1
        });
    });
});
