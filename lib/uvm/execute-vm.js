(function(universe) {
    var i,
        g,
        lib,
        sandboxedCode,
        libraries = {},
        postmanApi,
        scope;

    // Inject the libraries
    for (i = 0; i < requires.length; i++) {
        lib = requires[i];
        // Play around with the require cache
        console.log('Loading: ', lib.require);
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

    // Inject the Postman API
    scope.replace('postman', postmanApi);

    try {
        scope.globals.push(__sugarjs + code);
        sandboxedCode = Function.apply(universe, scope.globals);
    } catch (e) {
        universe.errors.push(e);
        if (!__async) { __done(scope); }
        return;
    }

    try {
        sandboxedCode.apply(scope.object, scope.transferables);
    } catch (e) {
        universe.errors.push(e);
    }
    if (!__async) { __done(scope); }
}(this));
