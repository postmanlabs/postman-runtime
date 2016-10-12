(function (universe) {
    var /**
     * Creates a scope object that contains globals exposed to scripts.
     *
     * @param replacements {Object=}
     * @constructor
     */
    Scope = function (replacements) {
        var globals = Object.getOwnPropertyNames(universe),
            object = {},
            transferables = [];

        !replacements && (replacements = {});

        Scope.ignoredGlobals.forEach(function (key) {
            var found = globals.indexOf(key);
            (found > -1) && globals.splice(found, 1);
        });

        Scope.allowedGlobals.forEach(function (key) {
            (globals.indexOf(key) === -1) && globals.push(key);
        });

        // add any extra item present in replacement globals
        Object.keys(replacements).forEach(function (key) {
            (globals.indexOf(key) === -1) && globals.push(key);
        });

        // now add the transferable values from allowedGlobals
        globals.forEach(function (key, index) {
            if (replacements.hasOwnProperty(key)) {
                transferables[index] = replacements[key];
                object[key] = replacements[key];
                return;
            }

            (Scope.allowedGlobals.indexOf(key) > -1) && (transferables[index] = universe[key]);

            // add the transferables to the scope
            (transferables[index] !== undefined) && (object[key] = universe[key]);
        });

        /**
         * Stores references to all the globals in an array, so that it can be used with Function.prototype.apply
         * @type {Array}
         */

        this.globals = globals;

        /**
         * Stores the names of the globals in an array. In the sandbox, globals[x] will be exposed with the name
         * specified in transferables[x]
         * @type {Array}
         */
        this.transferables = transferables;

        /**
         * Holds the name and reference as an object.
         * @type {Object}
         */
        this.object = object;
    };

    Scope.allowedGlobals = [
        // functions
        'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent',
        'encodeURI', 'encodeURIComponent', 'Array', 'ArrayBuffer', 'Buffer', 'Boolean', 'DataView', 'Date', 'Error', 'EvalError',
        'Float32Array', 'Float64Array', 'Function', 'Int8Array', 'Int16Array', 'Int32Array', 'Map', 'Number', 'Object',
        'Proxy', 'Promise', 'RangeError', 'ReferenceError', 'RegExp', 'Set', 'String', 'Symbol', 'SyntaxError',
        'TypeError', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'URIError', 'WeakMap', 'WeakSet',
        'JSON', 'Math', 'Reflect', 'escape', 'unescape',

        // properties
        'Infinity', 'NaN', 'undefined',

        'setTimeout', 'console', 'btoa', 'atob' // (temporary)
    ];

    Scope.ignoredGlobals = [
        'eval'
    ];

    Scope.prototype.replace = function (name, value) {
        var index = this.globals.indexOf(name);
        (index === -1) && (index = this.globals.length);

        this.globals[index] = name;
        this.transferables[index] = value;
        this.object[name] = value;
    };

    universe.Scope = Scope;
}(this));
