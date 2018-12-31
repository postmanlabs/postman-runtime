var expect = require('chai').expect,
    sinon = require('sinon');

describe('variable resolution', function () {
    var testrun;

    /**
     * Generates a poly chained variable nested n times
     *
     * @example
     * getPolyChainedVariable(2)
     * // returns '{{1{{0}}}}'
     *
     * @param {Integer} n
     * @returns {String}
     */
    function getPolyChainedVariable(n) {
        var i,
            str = '';

        for (i = 0; i < n; i++) {
            str = `{{${i}` + str;
        }

        str += '}}'.repeat(n);

        return str;
    }

    /**
     * Generates a object with n variables
     *
     * @example
     * getVariables(1, 2)
     * // returns [{ key: '1', value: '' }, { key: '2', value: '' }]
     *
     * @param {Integer} s - Variables starting number (inclusive)
     * @param {Integer} e - Variables ending number (inclusive)
     * @returns {Object[]}
     */
    function getVariables(s, e) {
        var i,
            variables = [];

        for (i = s; i <= e; i++) {
            variables.push({
                key: String(i),
                value: ''
            });
        }

        return variables;
    }

    before(function (done) {
        this.run({
            collection: {
                item: [{
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'raw',
                            raw: getPolyChainedVariable(21)
                        }
                    }
                }, {
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: {
                            mode: 'raw',
                            raw: getPolyChainedVariable(20) + `{{xyz${getPolyChainedVariable(19)}}}{{hello{{world}}}}`
                        }
                    }
                }],
                variable: [{
                    key: 'world',
                    value: 'World'
                }, {
                    key: 'helloWorld',
                    value: '{{22{{20{{19}}}}}}'
                }]
            },
            environment: {
                values: getVariables(0, 10)
            },
            globals: {
                values: getVariables(11, 21)
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should complete the run', function () {
        expect(testrun).to.be.ok;
        sinon.assert.calledOnce(testrun.start);
        sinon.assert.calledOnce(testrun.done);
        sinon.assert.calledWith(testrun.done.getCall(0), null);
    });

    it('should correctly resolve poly chained variables', function () {
        sinon.assert.calledTwice(testrun.request);
        sinon.assert.calledTwice(testrun.response);

        sinon.assert.calledWith(testrun.request.getCall(0), null);
        sinon.assert.calledWith(testrun.response.getCall(0), null);

        expect(testrun.request.getCall(0).args[3]).to.nested.include({
            'body.raw': '{{20{{19}}}}'
        });

        expect(testrun.request.getCall(1).args[3]).to.nested.include({
            'body.raw': '{{19}}{{xyz}}{{22}}'
        });
    });
});
