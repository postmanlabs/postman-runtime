const server = require('./_servers'),
    createDigestServer = server.createDigestServer,
    enableServerDestroy = require('server-destroy'),

    USERNAME = 'postman',
    PASSWORD = 'password';

let _digestServer;

module.exports = {
    listen (cb) {
        _digestServer = createDigestServer({
            username: USERNAME,
            password: PASSWORD
        }).listen(0, function (err) {
            if (err) { return cb(err); }

            module.exports.port = this.address().port;
            module.exports.url = 'http://localhost:' + module.exports.port;

            _digestServer.keepAliveTimeout = server.KEEP_ALIVE_TIMEOUT;
            enableServerDestroy(_digestServer);
            cb();
        });
    },

    destroy (cb) {
        _digestServer.destroy(cb);
    }
};
