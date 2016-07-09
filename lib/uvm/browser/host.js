var _ = require('lodash'),
    util = require('../util'),
    backpack = require('../../../lib/backpack'),

    sandboxClientCode = {
        start: require('raw!./sandbox-bus-start.js'),
        end: require('raw!./sandbox-bus-end.js')
    },

	MessageBus = require('./messagebus'),
	BrowserHost; // constructor

/**
 * A host instance is like a VM container that can execute scripts in a sandboxed environment.
 *
 * @param {Object} sandbox - an object that is available to the global scope of this host and is constantly updated with
 * changes when done from inside a running script
 *
 * @param {Object} options
 * @param {Array.<String>} options.requires - a set of libraries that are required and is made available to sandbox as
 * globals. (@todo this may later be converted to set of module subsets available for browserification)
 * @param {String=} options.requirePath - Path to load the requires from, e.g: /js/my-requires/
 * @param {Object.<Function>} options.on - events that are triggered when stuff happens inside the sandbox
 * @param {Function=} [options.on.execute]
 * @param {Function=} [options.on.timeout]
 * @param {Function=} [options.on.error]
 * @param {Function=} [options.on.exception]
 * @param {Function} callback - executed when the host is ready to execute scripts
 */
BrowserHost = function BrowserHost (sandbox, options, callback) {
	// account for polymorphic nature of options and callback
	if ((callback === undefined) && _.isFunction(options)) {
		callback = options;
		options = null;
	}
	if (!_.isFunction(callback)) { // be strict with the callback
		throw new Error('uvm.constructor() callback parameter missing.');
	}

    // ensure that the parameters this point on are valid for direct use
    callback = backpack.multiback(['bus-ready', 'host-ready'], callback, [null, this]);
    options = _.isObject(options) ? _.clone(options) : {};

	var self = this;

    _.extend(this, {
        /**
         * @private
         * @type {Object.<Function>}
         */
        on: _.isObject(options.on) ? _.clone(options.on) : {},
        /**
         * @private
         * @type {Object.<Function>}
         */
        pending: {},
        /**
         * @type {String}
         */
        id: util.uuid()
    });

    // create a bus
    this.bus = new MessageBus(BrowserHost.origin, this.id, this.on, function (err, bus) {
        if (err) { return callback(err); }

        // add the execution callback handler
        bus.listen('__um_execute', function (id, seq) {
            if (!_.isObject(seq)) {
                throw new Error('uvm: bus communication error');
            }
            // if there is nothing pending, we simply move on.
            if (!self.pending.hasOwnProperty(id)) {
                return; // @todo internal debug log here
            }

            var callback = self.pending[id];

            // compute the time taken to execute this code
            seq.end = global.Date.now();
            seq.time = (seq.end - seq.start);

            // execute the callback function and delete it from pending stack
            delete self.pending[id];
            callback.call(self, seq.error, seq);
        });

        callback(null, 'bus-ready');
    });

    // create the host iframe and when it is ready, connect it with the newly created bus
    this.hostel = BrowserHost.createHostElement(this.generateHostHTML(options.requires, options.requirePath),
            this.id, function (err, host) {
        if (err) { // on error ensure you dispose the element
            self.dispose();
            return callback(err);
        }
        self.bus.connect(host);
        callback(null, 'host-ready');
    });
};

_.extend(BrowserHost.prototype, /** @lends BrowserHost.prototype */ {
    /**
     *
     * @param {String} code
     * @param {Object} options
     * @param {Boolean=} [options.async=false]
     * @param {Number=} [options.timeout=0]
     * @param {Object=} [options.masked]
     * @param {Object=} [options.globals] (@todo: this currently does not accept strings, but it should)
     * @param {Function} callback
     *
     * @returns {String} - id of the execution
     */
    execute: function (code, options, callback) {
        !_.isObject(options) && (options = {});
        var id = util.uuid();

        if (!_.isFunction(callback)) {
            throw new Error('uvm.execute() callback parameter is required');
        }
        if (!this.bus.ready) {
            return callback.call(this, new Error('uvm.execute() communication bus not ready'));
        }
        if (this.pending[id]) {
            return callback.call(this, new Error('uvm.execute() execute entropy drained'));
        }

        // set the start time for execution. required for calculating execution time later
        options.start = Date.now();

        // queue the callback for later execution when a return is fired. ensure that it is removed from the list of
        // pending callbacks
        options.timeout && (callback = backpack.timeback(callback, options.timeout, this, function () {
            this.pending[id] && (delete this.pending[id]);
        }));
        this.pending[id] = callback;

        // forward the execution to the client
        this.bus.send('__um_execute', id, code, options);
        return id;
    },

    /**
     * @private
     * @param {String} event
     */
    trigger: function (event) {
        _.isFunction(this.on[event]) && this.on[event].apply(this, _.tail(arguments));
    },

    /**
     * Disposes a BrowserContext instance by clearing its bus and host element.
     */
	dispose: function () {
        if (this.bus) {
            this.bus.dispose();
            this.bus = null;
        }
        if (this.hostel) {
            this.hostel.parentNode && this.hostel.parentNode.removeChild(this.hostel);
            this.hostel = null;
        }
	},

    /**
     * @private
     * @param {Array.<String>} requires
     * @param requirePath
     * 
     * @returns {String}
     */
    generateHostHTML: function (requires, requirePath) {
        var tmpl = BrowserHost.html,
            html = [];

        // start the bus base script
        html.push(tmpl.script(null, 'var __um = "' + global.btoa(JSON.stringify({
                bus: {
                    source: this.id,
                    target: BrowserHost.origin
                }
            })) + '";'));
        html.push(tmpl.script(null, sandboxClientCode.start));

        // load all the library file requirements as simple scripts
        _.isArray(requires) && _.each(requires, function (library) {
            html.push(tmpl.script(library, null, requirePath));
        });

        // close the bus communication
        html.push(tmpl.script(null, sandboxClientCode.end));
        html.push(tmpl.script(null, 'delete window.__um'));

        return tmpl.document(html.join(''));
    }
});

_.extend(BrowserHost, /** @lends BrowserHost */ {
	/**
	 * [id description]
	 *
	 * @type {[type]}
	 */
	id: global.chrome.runtime.id,

	/**
	 * [origin description]
	 *
	 * @type {String}
	 */
	origin:  ('chrome-extension://' + global.chrome.runtime.id),

	/**
	 * [html description]
	 *
	 * @type {Object}
	 */
	html: {
		/**
		 * [script description]
		 *
		 * @param {String} src [description]
		 * @param {String} content [description]
		 * @param {String} path
         *
         * @returns {String} [description]
		 */
		script: function (src, content, path) {
            path && !_.endsWith(path, '/') && (path = path + '/'); // ensure that the path ends with a trailing '/'
			return '<script type="text/javascript"' + (src ?
				(' src="chrome-extension://' + BrowserHost.id + (path ? path : '/') +
					encodeURIComponent(src) + '.js"') : '') + '>' +
				(content ? content : '') + '</script>';
		},

		/**
		 * [document description]
		 *
		 * @param {[type]} wrap [description]
		 *
		 * @returns {[type]} [description]
		 */
		document: function (wrap) {
			var html = '';
			html += '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html;charset=UTF-8">';
			html += '<meta charset="UTF-8">';
			html += wrap;
			html += '</head><body></body></html>';
			return html;
		}
	},

	/**
	 * @param {String} content
	 * @param {String} id
	 * @param {Function} callback
	 * @returns {Object}
	 */
	createHostElement: function (content, id, callback) {
		var el;

		// do the entire dom manipulation in a try block so that the error can be bubbled
		try {
			el = global.document.createElement('iframe');
			id && el.setAttribute('id', id);
			el.setAttribute('style', 'display: none; width: 0; height:0;');
			el.setAttribute('src', 'data:text/html;base64, ' + btoa(content));

			// listen to the load completion listener
			_.isFunction(callback) && el.addEventListener('load', function () {
				return callback(null, el);
			});

			global.document.body.appendChild(el); // attach to body
		}
		catch (err) {
            // try disposing the element if created
            try { el && el.parentNode && el.parentNode.removeChild(el); }
            catch (e) {} // cannot do anything with an error here

			// exit with error callback
			_.isFunction(callback) && callback(err);
			return;
		}

		return el;
	}
});

module.exports = BrowserHost;
