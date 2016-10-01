(function(universe) {
    var i,
        g,
        lib,
        sandboxedCode,
        libraries = {},
        postmanApi,
        scope,

        // references for us to use
        on = universe.on,
        __globals = universe.__globals,
        __done = universe.__done,
        __async = universe.__async,
        __delete = universe.__delete,
        __require = universe.__require,
        __masked = universe.__masked,
        requires = universe.requires,
        errors = universe.errors,
        replacements;

    __delete && __delete.length && __delete.forEach(function(key) {
        delete universe[key];
    });

    replacements = {
        setTimeout: function (fn, ms) {
            return setTimeout(function () {
                try { return fn.apply(this, arguments); }
                catch (e) {
                    on.exception(e);
                }
            }, ms);
        },

        setInterval: function (fn, ms) {
            return setInterval(function () {
                try { return fn.apply(this, arguments); }
                catch (e) {
                    on.exception(e);
                }
            }, ms);
        },

        XMLHttpRequest: function FakeXmlHTTPRequest () { return this; },

        console: {
            log: on.console.bind(on, __masked.cursor, 'log'),
            info: on.console.bind(on, __masked.cursor, 'info'),
            warn: on.console.bind(on, __masked.cursor, 'warn'),
            error: on.console.bind(on, __masked.cursor, 'error'),
            debug: on.console.bind(on, __masked.cursor, 'debug')
        }
    };

    // Require the libraries
    for (i = 0; i < requires.length; i++) {
        lib = requires[i];
        // Play around with the require cache
        try {
            libraries[lib.object] = __require(lib.require);
        }
        catch (e) {
            libraries[lib.object] = undefined;
            on.exception(e); // We'll try to run without this library
        }
    }

    // special handling for xml2Json - it requires wrapping the library into a function
    // todo: find a better home for this
    libraries.xml2Json = function (string) {
        var JSON = {};
        libraries.xml2js.parseString(string, {
            explicitArray: false,
            async: false,  // this ensures that it works in the sync sandbox we currently have in the app
            trim: true,
            mergeAttrs: false
        }, function (err, result) {
            JSON = result;
        });
        return JSON;
    };

    // Create the postman API
    postmanApi = new PostmanApi(__masked, __globals);

    scope = new Scope(universe);

    // Inject the globals
    for (g in __globals) {
        __globals.hasOwnProperty(g) && scope.replace(g, __globals[g]);
    }

    // Inject the libraries
    for (lib in libraries) {
        libraries.hasOwnProperty(lib) && scope.replace(lib, libraries[lib]);
    }

    // Inject the Postman API
    scope.replace('postman', postmanApi);

    // Inject the replacements
    for (g in replacements) {
        replacements.hasOwnProperty(g) && scope.replace(g, replacements[g]);
    }

    try {
        scope.globals.push(code);
        sandboxedCode = Function.apply(universe, scope.globals);
    }
    catch (e) {
        errors.push(e);
        if (!__async) { __done(scope); }
        return;
    }

    try {
        sandboxedCode.apply(scope.object, scope.transferables);
    }
    catch (e) {
        errors.push(e);
    }
    if (!__async) { __done(scope); }
}(this));
