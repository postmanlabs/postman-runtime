require('shelljs/global');
require('colors');

require('async').series([
    require('./test-lint'),
    require('./test-system'),
    require('./test-unit'),
    require('./test-integration'),
    require('./test-integration-legacy')
], function (code) {
    !code && console.log('\npostman-runtime tests: all ok!'.green);
    exit(code);
});
