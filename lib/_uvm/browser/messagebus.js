var _ = require('lodash'),
    util = require('../util'),
    backpack = require('../../../lib/backpack'),

    MESSAGEBUS_TIMEOUT = 10000,
    MessageBus;

MessageBus = function (origin, target, listeners, callback) {
    // without callback this cannot function, hence throw error
    if (typeof callback !== 'function') {
        throw new Error('messagebus: callback parameter missing');
    }
    // ensure that target and origin is specified
    if (!(origin && target)) {
        return callback(new Error('message-bus: invalid origin or target'));
    }

    var self = this,
        register;

    // The callback is converted to multiback which waits for the callback to be called twice with the arguments
    // 'initialised' and 'handshaken' and then calls the original callback with (null, this)
    register = backpack.multiback(['initialised', 'handshaken'], function (err) {
        (!err) && (self.ready = true);
        callback.apply(this, arguments);
    }, [null, this], MESSAGEBUS_TIMEOUT);

    // store all relevant information within this instance
    _.extend(self, {
        origin: origin,
        target: target,
        listeners: (listeners = _.isObject(listeners) ? _.clone(listeners) : {}),
        host: null
    });

    // Add default listeners to listen to internal bus events
    _.extend(listeners, {
        '__mbus_init': function (err) {
            self.initialised = true;
            register(err, 'initialised');
        },
        '__mbus_handshake': function (err) {
            self.handshaken = true;
            self.send('__mbus_handshake_ack');
            register(err, 'handshaken');
        }
    });

    // attach the message listener to the global listener so that it responds to messages
    self.dispose = util.attach(global, 'message', function (event) {
        var data = self.data(event);

        // if args is false, then message verification failed and hence we exit
        if (!data) { return; }

        // raise events if a listener is found for it.
        _.isFunction(listeners[data.n]) && listeners[data.n].apply(self, data.a);
    }, function () {
        self.disconnect();
        self = null;
    });
};

_.extend(MessageBus.prototype, {
    connect: function (host) {
        this.host = host;
    },

    disconnect: function () {
        MessageBus.send(this.host, '__mbus_disconnect', [], this.origin, this.target);
        this.host = null;
    },

    ping: function () {
        try {
            MessageBus.send(this.host, '__mbus_ping', [Date.now()], this.origin, this.target);
        }
        catch (err) {
            console.log('unable to send ping ' + err.message);
        }
    },

    data: function (event) {
        return event && event.data && (event.data.o === this.target) && (event.data.t === this.origin) &&
            Array.isArray(event.data.a) && event.data.n && event.data;
    },

    send: function (eventName) {
        MessageBus.send(this.host, eventName, Array.prototype.slice.call(arguments, 1), this.origin, this.target);
    },

    listen: function (name, listener) {
        if (this.listeners[name] || (typeof listener !== 'function')) {
            throw new Error('messagebus: invalid client listener - ' + name);
        }
        this.listeners[name] = listener;
    }
});

_.extend(MessageBus, {
    send: function (host, event, args, origin, target) {
        if (!(host && host.contentWindow && (typeof host.contentWindow.postMessage === 'function'))) {
            throw new Error('messagebus: not connected');
        }
        host.contentWindow.postMessage({
            n: event,
            a: args,
            o: origin,
            t: target
        }, '*');
    }
});

module.exports = MessageBus;
