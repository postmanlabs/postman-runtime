describe('UVM allowed globals', function () {
    var testrun,
        globals = ['isNaN', 'SyntaxError', 'ArrayBuffer', 'JSON', 'unescape', 'URIError', 'TypeError', 'WeakSet',
            'Array', 'parseFloat', 'EvalError', 'parseInt', 'Error', 'Object', 'Scope', 'Int16Array',
            'NaN', 'Uint8ClampedArray', 'Uint32Array', 'Date', 'Intl', 'ReferenceError', 'PostmanApi',
            'Uint16Array', 'Int8Array', 'Boolean', 'RangeError', 'isFinite', 'encodeURIComponent', 'encodeURI',
            'decodeURI', 'String', 'undefined', 'Symbol', 'Set', 'WeakMap', 'Math', 'DataView', 'Int32Array',
            'Function', 'Number', 'Infinity', 'Promise', 'Float64Array', 'Float32Array', 'Map', 'RegExp',
            'decodeURIComponent', 'escape', 'Uint8Array', 'globals', 'environment', 'data', 'moment',
            'iteration', 'request', 'responseCookies', 'responseBody', 'responseCode', 'responseHeaders',
            'responseTime', 'tests', '_', 'CryptoJS', 'tv4', 'cheerio', 'Backbone', 'xml2js', 'atob', 'btoa', 'Buffer',
            'xml2Json', 'postman', 'setTimeout', 'setInterval', 'XMLHttpRequest', 'console'];

    // add `Proxy` and `Reflect` objects for Node v6, which has them globally available.
    (typeof Proxy !== 'undefined') && globals.push('Proxy');
    (typeof Reflect !== 'undefined') && globals.push('Reflect');

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
                    request: 'httpbin.org/get'
                }
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });

    it('must have started and completed the test run', function () {
        expect(testrun).be.ok();
        expect(testrun.done.calledOnce).be.ok();
        expect(testrun.start.calledOnce).be.ok();
    });

    it('must have run the test script, and had no extra globals', function () {
        expect(testrun.console.calledOnce).be.ok();

        var args = testrun.console.getCall(0).args;
        expect(args[1]).to.be('log');
        expect(args[2].sort()).to.eql(globals.sort());
    });
});
