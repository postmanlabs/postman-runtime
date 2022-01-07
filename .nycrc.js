const TEST_TYPE = ((argv) => {
    let match = argv[argv.length - 1].match(/npm\/test-(\S+).js/);

    return match && match[1] || '';
})(process.argv);

function configOverrides(testType) {
    switch (testType) {
        case 'unit':
            return {
                statements: 40,
                branches: 30,
                functions: 30,
                lines: 40
            };
        case 'integration':
            return {
                statements: 65,
                branches: 60,
                functions: 70,
                lines: 65
            };
        case 'integration-legacy':
            return {
                statements: 45,
                branches: 35,
                functions: 45,
                lines: 45
            };
        default:
            return {}
    }
}

module.exports = {
    all: true,
    'check-coverage': true,
    'report-dir': '.coverage',
    'temp-dir': '.nyc_output',
    include: ['lib/**/*.js'],
    reporter: ['lcov', 'json', 'text', 'text-summary'],
    ...configOverrides(TEST_TYPE),
};
