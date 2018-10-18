var expect = require('chai').expect;

describe('UVM allowed globals', function () {
    var testrun,
        globals = ['isNaN', 'SyntaxError', 'ArrayBuffer', 'JSON', 'unescape', 'URIError', 'TypeError', 'WeakSet',
            'Array', 'parseFloat', 'EvalError', 'parseInt', 'Error', 'Object', 'Int16Array',
            'NaN', 'Uint8ClampedArray', 'Uint32Array', 'Date', 'ReferenceError', 'Proxy', 'Reflect',
            'Uint16Array', 'Int8Array', 'Boolean', 'RangeError', 'isFinite', 'encodeURIComponent', 'encodeURI',
            'decodeURI', 'String', 'undefined', 'Symbol', 'Set', 'WeakMap', 'Math', 'DataView', 'Int32Array',
            'Function', 'Number', 'Infinity', 'Promise', 'Float64Array', 'Float32Array', 'Map', 'RegExp',
            'decodeURIComponent', 'escape', 'Uint8Array', 'globals', 'environment', 'data',
            'iteration', 'request', 'responseCookies', 'responseBody', 'responseCode', 'responseHeaders',
            'responseTime', 'tests', '_', 'CryptoJS', 'tv4', 'cheerio', 'Backbone', 'atob', 'btoa', 'Buffer',
            'xml2Json', 'postman', 'setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval',
            'clearImmediate', 'console', 'pm'];

    if (typeof window !== 'undefined') {
        globals.push('XMLHttpRequest');
        globals.push('window');
        globals.push('document');
        globals.push('$');
        globals.push('jQuery');
    }

    before(function (done) {
        this.run({
            collection: {
                item: {
                    name: 'r3',
                    event: [{
                        listen: 'test',
                        script: {
                            type: 'text/javascript',
                            exec: 'console.log(Object.keys(this));'
                        }
                    }],
                    request: 'postman-echo.com/get'
                }
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('should have started and completed the test run', function () {
        expect(testrun).to.be.ok;
        expect(testrun).to.nested.include({
            'done.calledOnce': true,
            'start.calledOnce': true
        });
    });

    it('should have run the test script, and had no extra globals', function () {
        expect(testrun).to.nested.include({
            'console.calledOnce': true
        });

        var args = testrun.console.getCall(0).args;
        expect(args[1]).to.equal('log');
        expect(args[2].sort()).to.eql(globals.sort());
    });
});
