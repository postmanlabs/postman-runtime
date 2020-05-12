const fs = require('fs'),
    path = require('path'),
    async = require('async'),

    IGNORE_FILES = ['index.js', '_servers.js', 'servers.json', '.gitignore'],
    IGNORE_SERVERS = ['httpIPv6.js'],
    SERVERS = [],
    URLS = {};

fs.readdirSync(__dirname).forEach(function (file) {
    if (IGNORE_FILES.includes(file)) { return; }

    // IPv6 is disabled on Travis
    // eslint-disable-next-line no-process-env
    if (process.env.TRAVIS && IGNORE_SERVERS.includes(file)) { return; }

    SERVERS.push({
        name: path.basename(file, '.js'),
        server: require(path.join(__dirname, file))
    });
});

module.exports = {
    start: function (callback) {
        async.each(SERVERS, function (s, next) {
            s.server.listen(function (err) {
                if (err) { return next(err); }

                URLS[s.name] = s.server.url;
                next();
            });
        }, function (err) {
            if (err) { return callback(err); }

            fs.writeFileSync(path.join(__dirname, 'servers.json'), JSON.stringify(URLS));

            callback();
        });
    },

    close: function (callback) {
        async.each(SERVERS, function (server, next) {
            server.server.destroy(next);
        }, callback);
    }
};
