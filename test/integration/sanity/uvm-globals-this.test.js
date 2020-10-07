/* eslint-disable no-multi-spaces */
var expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('UVM allowed globals', function () {
    var testrun,
        globals = [
            'Array',           'ArrayBuffer',        'Atomics',
            'Backbone',        'BigInt',             'BigInt64Array',
            'BigUint64Array',  'Boolean',            'Buffer',
            'CryptoJS',        'DataView',           'Date',
            'Error',           'EvalError',          'Float32Array',
            'Float64Array',    'Function',           'Infinity',
            'Int16Array',      'Int32Array',         'Int8Array',
            'JSON',            'Map',                'Math',
            'NaN',             'Number',             'Object',
            'Promise',         'Proxy',              'RangeError',
            'ReferenceError',  'Reflect',            'RegExp',
            'Set',             'SharedArrayBuffer',  'String',
            'Symbol',          'SyntaxError',        'TypeError',
            'URIError',        'Uint16Array',        'Uint32Array',
            'Uint8Array',      'Uint8ClampedArray',  'WeakMap',
            'WeakSet',         '_',                  'atob',
            'btoa',            'cheerio',            'clearImmediate',
            'clearInterval',   'clearTimeout',       'console',
            'data',            'decodeURI',          'decodeURIComponent',
            'encodeURI',       'encodeURIComponent', 'environment',
            'escape',          'globals',            'isFinite',
            'isNaN',           'iteration',          'parseFloat',
            'parseInt',        'pm',                 'postman',
            'request',         'responseBody',       'responseCode',
            'responseCookies', 'responseHeaders',    'responseTime',
            'setImmediate',    'setInterval',        'setTimeout',
            'tests',           'tv4',                'undefined',
            'unescape',        'xml2Json'
        ];

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
