var Host = require('./host'); // constructor

module.exports = {
    createHost: function (sandbox, options, callback) {
        return new Host(sandbox, options, callback);
    }
};
