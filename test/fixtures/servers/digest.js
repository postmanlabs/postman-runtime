const server = require('./_servers'),
    createDigestServer = server.createDigestServer,
    enableServerDestroy = require('server-destroy'),

    USERNAME = 'postman',
    PASSWORD = 'password';

let _digestServer;

module.exports = {
    listen: function (cb) {
        _digestServer = createDigestServer({
            username: USERNAME,
            password: PASSWORD
        }).listen(0, function (err) {
            if (err) { return cb(err); }

            module.exports.port = this.address().port;
            module.exports.url = 'http://localhost:' + module.exports.port;

            enableServerDestroy(_digestServer);
            cb();
        });
    },

    destroy: function (cb) {
        _digestServer.destroy(cb);
    }
};
