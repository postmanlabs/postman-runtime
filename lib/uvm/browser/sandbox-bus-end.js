'use strict';
(function (win, um) {
    var bus = um.bus,

        replacements = function (id, options) {
            return {
                setTimeout: function (fn, ms) {
                    return setTimeout(function () {
                        try { return fn.apply(this, arguments); }
                        catch (e) {
                            bus.send('error', { name: e.name, message: e.message }, options);
                        }
                    }, ms);
                    //throw new Error('setTimeout is restricted within sandboxed environment');
                },
                setInterval: function (fn, ms) {
                    return setInterval(function () {
                        try { return fn.apply(this, arguments); }
                        catch (e) {
                            bus.send('error', { name: e.name, message: e.message }, options);
                        }
                    }, ms);
                    //throw new Error('setInterval is restricted within sandboxed environment');
                },
                XMLHttpRequest: function FakeXmlHTTPRequest () {},
                console: new (function (cursor) {
                    this.log = bus.send.bind(bus, 'console', cursor, 'log');
                    this.info = bus.send.bind(bus, 'console', cursor, 'info');
                    this.warn = bus.send.bind(bus, 'console', cursor, 'warn');
                    this.error = bus.send.bind(bus, 'console', cursor, 'error');
                    this.debug = bus.send.bind(bus, 'console', cursor, 'debug');
                })(options.masked.cursor),
                postman: new (um.PostmanApi)(options.masked, options.globals)
            };
        };

    bus.listen('__um_execute', function (id, code, options) {
        !options && (options = {});

        var sandboxedCode,
            scope = um.scope(replacements(id, options)),
            complete = function () {
                // ensure that the updated globals are pushed back to the event
                if (options.globals) {
                    Object.keys(options.globals).forEach(function (key) {
                        options.globals[key] = scope.object[key];
                    });
                }
                bus.send('__um_execute', id, options);
            },
            prop;

        // forward all the globals to the scope
        for (prop in options.globals) {
            options.globals.hasOwnProperty(prop) && scope.replace(prop, options.globals[prop]);
        }

        options.async && scope.replace('done', function (err) {
            options.data = arguments;
            err && bus.send('error', (options.error = (err.hasOwnProperty('message') ?
                { name: err.name, message: err.message } : err)), options);

            complete();
        });

        // try and create an execution function of the code
        try {
            // add the code to the global definition
            scope.globals.push(code);
            sandboxedCode = Function.apply(win, scope.globals);
        }
        catch (e) {
            console.error(e);
            bus.send('error', (options.error = { name: e.name, message: e.message }), options);
            complete();
            return;
        }

        try {
            sandboxedCode.apply(scope.object, scope.transferables);
            // in case this is not marked as async code, just go ahead and send execution completion event
            if (!options.async) {
                complete();
            }
        }
        catch (e) {
            // in case there was an async wait, clear it.
            console.error(e);
            bus.send('error', (options.error = { name: e.name, message: e.message }), options);
            complete();
        }
    });
}(this, this.__um));
