(function(universe) {
    var i,
        g,
        lib,
        sandboxedCode,
        libraries = {},
        postmanApi,
        scope,

        replacements = {
            setTimeout: function (fn, ms) {
                return setTimeout(function () {
                    try { return fn.apply(this, arguments); }
                    catch (e) {
                        universe.on.exception(e);
                    }
                }, ms);
            },

            setInterval: function (fn, ms) {
                return setInterval(function () {
                    try { return fn.apply(this, arguments); }
                    catch (e) {
                        universe.on.exception(e);
                    }
                }, ms);
            },

            XMLHttpRequest: function FakeXmlHTTPRequest () { return this; },

            console: {
                log: universe.on.console.bind(universe.on, __masked.cursor, 'log'),
                info: universe.on.console.bind(universe.on, __masked.cursor, 'info'),
                warn: universe.on.console.bind(universe.on, __masked.cursor, 'warn'),
                error: universe.on.console.bind(universe.on, __masked.cursor, 'error'),
                debug: universe.on.console.bind(universe.on, __masked.cursor, 'debug')
            }
        };

    // Require the libraries
    for (i = 0; i < requires.length; i++) {
        lib = requires[i];
        // Play around with the require cache
        libraries[lib.object] = __require(lib.require);
    }

    // Create the postman API
    postmanApi = new PostmanApi(__masked, __globals);

    __delete && __delete.length && __delete.forEach(function(key) {
        delete universe[key];
    });

    scope = new Scope(universe);

    // Inject the globals
    for (g in universe.__globals) {
        universe.__globals.hasOwnProperty(g) && scope.replace(g, universe.__globals[g]);
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
        scope.globals.push(__sugarjs + code);
        sandboxedCode = Function.apply(universe, scope.globals);
    }
    catch (e) {
        universe.errors.push(e);
        if (!__async) { __done(scope); }
        return;
    }

    try {
        sandboxedCode.apply(scope.object, scope.transferables);
    }
    catch (e) {
        universe.errors.push(e);
    }
    if (!__async) { __done(scope); }
}(this));
