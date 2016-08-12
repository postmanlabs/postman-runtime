'use strict';
(function (win) {
    var MessageBus,
        Scope;

    Scope = function (replacements) {
        var globals = Object.keys(win),
            object = {},
            transferables = [];

        !replacements && (replacements = {});

        Scope.ignoredGlobals.forEach(function (key) {
            var found = globals.indexOf(key);
            (found > -1) && globals.splice(found, 1);
        });

        // add any extra globals that are not enumerable
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

            (Scope.allowedGlobals.indexOf(key) > -1) && (transferables[index] = win[key]);
            // add the transferables to the scope
            (transferables[index] !== undefined) && (object[key] = win[key]);
        });

        this.globals = globals;
        this.transferables = transferables;
        this.object = object;
    };

    Scope.prototype.replace = function (name, value) {
        var index = this.globals.indexOf(name);
        (index === -1) && (index = this.globals.length);

        this.globals[index] = name;
        this.transferables[index] = value;
        this.object[name] = value;
    };

    Scope.allowedGlobals = [
        // functions
        'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent',
        'encodeURI', 'encodeURIComponent', 'Array', 'ArrayBuffer', 'Boolean', 'DataView', 'Date', 'Error', 'EvalError',
        'Float32Array', 'Float64Array', 'Function', 'Int8Array', 'Int16Array', 'Int32Array', 'Map', 'Number', 'Object',
        'Proxy', 'Promise', 'RangeError', 'ReferenceError', 'RegExp', 'Set', 'String', 'Symbol', 'SyntaxError',
        'TypeError', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'URIError', 'WeakMap', 'WeakSet',
        'JSON', 'Math', 'Reflect', 'escape', 'unescape', 'Buffer',

        // properties
        'Infinity', 'NaN', 'undefined',

        'console', 'btoa', 'atob' // (temporary)
    ];

    Scope.ignoredGlobals = [
        'eval'
    ];

    Scope.trackedGlobals = Object.keys(win);

    Scope.trackNewGlobals = function () {
        var allowed = this.allowedGlobals,
            tracked = this.trackedGlobals,
            current = Object.keys(win);

        // extract the difference between the two globals and retain the subset
        current.filter(function (key) {
            // filter only the ones that were not in initial global list
            if (tracked.indexOf(key) === -1) {
                // add any extra items to allowed globals list
                (allowed.indexOf(key) == -1) && allowed.push(key);

                // add the new globals to tracked globals
                tracked.push(key);
                return true;
            }
        });
    };

    MessageBus = function (host, options, listeners, callback) {
		!options && (options = {});
		!listeners && (listeners = {});

		var self = this,
			source = options.source,
			target = options.target,

			onReceive,
            onError,
            onLoad;


        if (!(source && target && (typeof callback === 'function'))) {
            throw new Error('messagebus: invalid client parameters: ' + source + ', ' + target);
        }

        this.source = source;
        this.target = target;

        // add listener to acknowledge handshake
        listeners.__mbus_handshake_ack = function () {
            var connecting = self.connecting;
            if (connecting) {
                connecting && (self.connecting = clearTimeout(self.connecting));
                self.connected = true;
                connecting && callback.call(self);
            }
        };

        // add listener to respond to ping
        listeners.__mbus_ping = function (start) {
            console.log('ping reply from ' + self.source + ' ' + (start ? (Date.now() - start) : 'unknown ') + 'ms');
        };

        // setup a timeout to safeguard handshake callback timeout
        this.connecting = setTimeout(function () {
            self.connecting = null;
            callback.call(self, new Error('messagebus: connection handshake acknowledgement timed out'));
        }, 10000);

        this.listen = function (name, listener) {
            if (listeners[name] || (typeof listener !== 'function')) {
                throw new Error('messagebus: invalid client listener');
            }
            listeners[name] = listener;
        };

        this.dispose = function () {
            onReceive && win.removeEventListener('message', onReceive);
            onError && win.removeEventListener('error', onError);
            onLoad && win.removeEventListener('load', onLoad);
            onReceive = null;
            onError = null;
            onLoad = null;
            host = null;
        };

        this.send = function (eventName) {
            if (!(host && (typeof host.postMessage === 'function'))) {
                throw new Error('messagebus: client not connected');
            }
            host.postMessage({
                o: source,
                t: target,
                n: eventName,
                a: Array.prototype.slice.call(arguments, 1)
            }, target);
        };

		win.addEventListener('message', (onReceive = function (event) {
			// verify message source
			if (!event || !event.data || (event.origin !== target)) { return; }

			var msg = event.data,
				eventName = msg.n;

			// and ensure that msg target is accurate and that it has a return tag
			if ((msg.t !== source) || (msg.o !== target) || !msg.n || !Array.isArray(msg.a)) {
				return;
			}

			// raise events if a listener is found for it.
			// @todo raise warning for missing listeners?
			(typeof listeners[eventName] === 'function') && listeners[eventName].apply(self, msg.a);
		}));

        win.addEventListener('error', (onError = function (err) {
            err || (err = {});
            self.send('exception', err.message, err.type, {
                line: err.lineno,
                column: err.colno
            });
        }));

        (win.document.readyState === 'complete') ? self.bus.send('__mbus_handshake') :
            (win.addEventListener('load', (onLoad = function () {
                self.send('__mbus_handshake');
            })));

        // send the initialisation message
        self.send('__mbus_init');
	};

    // ---------------------------------------------------------------------------------------------------------- //
    var um = JSON.parse(win.atob(win.__um));

    // start a new message bus
    um.bus = new MessageBus(win.parent, {
        source: um.bus.source,
        target: um.bus.target
    }, null, function (err) {
        if (err) {
            return console.log(err.message);
        }
        Scope.trackNewGlobals();
        // clean up closure
        um = null;
    });

    // function to create new scope
    um.scope = function (replacements) {
        return new Scope(replacements);
    };

    um.PostmanApi = function (masked, options) {
        masked = masked || {};
        options = options || {};

        var environment = options.environment,
            globals = options.globals,
            insensitiveCookies = {},
            insensitiveHeaders = {},
            cookie,
            prop,
            i;

        for (prop in options.responseHeaders) {
            if (options.responseHeaders.hasOwnProperty(prop)) {
                (insensitiveHeaders[prop.toLowerCase()] = options.responseHeaders[prop]);
            }
        }

        if (options.responseCookies) {
            for (i = 0; i < options.responseCookies.length; i++) {
                cookie = options.responseCookies[i];
                if ((typeof cookie.name) === 'string') {
                    insensitiveCookies[cookie.name.toLowerCase()] = cookie;
                }
            }
        }

        return {
            getResponseCookie: (masked.scriptType === 'test') ? function (cookieName) {
                return insensitiveCookies[cookieName.toLowerCase()];
            } : undefined,
            getResponseHeader: (masked.scriptType === 'test') ? function (headerString) {
                return insensitiveHeaders[headerString.toLowerCase()];
            } : undefined,
            setEnvironmentVariable: function (key, value) {
                value && value.toString && (typeof value.toString === 'function') && (value = value.toString());
                environment[key] = value;
            },
            getEnvironmentVariable: function (key) {
                return environment[key];
            },
            clearEnvironmentVariables: function () {
                for (var key in environment) {
                    if (environment.hasOwnProperty(key)) {
                        delete environment[key];
                    }
                }
            },
            clearEnvironmentVariable: function (key) {
                delete environment[key];
            },
            getGlobalVariable: function (key) {
                return globals[key];
            },
            setGlobalVariable: function (key, value) {
                value && value.toString && (typeof value.toString === 'function') && (value = value.toString());
                globals[key] = value;
            },
            clearGlobalVariables: function () {
                for (var key in globals) {
                    if (globals.hasOwnProperty(key)) {
                        delete globals[key];
                    }
                }
            },
            clearGlobalVariable: function (key) {
                delete globals[key];
            },
            setNextRequest: function (what) {
                masked.nextRequest = what;
            }
        }
    };

    // block all ajax
    win.XMLHttpRequest.prototype.send = function () {
        throw new Error('XMLHttpRequest usage is restricted within sandbox environment');
    };

    win.__um = um; // attach the um transformation back to window
}(this));
