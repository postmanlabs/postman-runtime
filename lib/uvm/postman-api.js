(function (universe) {
    universe.PostmanApi = function (masked, options) {
        masked = masked || {};
        options = options || {};

        var environment = options.environment,
            globals = options.globals,
            insensitiveHeaders = {},
            insensitiveCookies = {},
            prop,
            i;

        for (prop in options.responseHeaders) {
            if (options.responseHeaders.hasOwnProperty(prop)) {
                (insensitiveHeaders[prop.toLowerCase()] = options.responseHeaders[prop]);
            }
        }

        if (options.responseCookies) {
            for (i = 0; i < options.responseCookies.length; i++) {
                insensitiveCookies[options.responseCookies[i].name] = options.responseCookies[i];
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
        };
    };
}(this));
