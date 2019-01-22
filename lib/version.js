var RUNTIME_PACKAGE = require('../package.json'),

    /**
     * @const
     * @type {String[]}
     */
    PACKAGES_TO_CONSIDER = [
        'chai-postman',
        'postman-collection',
        'postman-request',
        'postman-sandbox',
        'uniscope',
        'uvm'
    ],

    /**
     * Generate object containing version and dependencies of runtime or given module.
     *
     * @param {String} [moduleName] - Module name
     * @param {Boolean} [deepDependencies=true] - Do depth dependencies traversal or stop at root
     * @param {Object} [moduleData={}] - Object to store module data
     * @returns {Object}
     *
     * @example <caption>Returned Object Structure</caption>
     * var runtime = require('.');
     * runtime.version();
     * {
     *     version: '7.6.1',
     *     dependencies: {
     *         'postman-collection' : {
     *             version: '3.4.2',
     *             dependencies: {
     *                 'postman-request': {
     *                     version: '2.88.1-postman.5'
     *                 }
     *             }
     *         },
     *         'postman-request': {
     *             version: '2.88.1-postman.5'
     *         }
     *     }
     * }
     */
    getModuleData = function (moduleName, deepDependencies, moduleData) {
        !moduleData && (moduleData = {});
        (deepDependencies === undefined) && (deepDependencies = true);

        var key,
            // runtime's package.json
            packageJson = RUNTIME_PACKAGE,
            // version of dependency of given module
            version;

        if (
            moduleName &&
            (
                // dependency not in PACKAGES_TO_CONSIDER
                !PACKAGES_TO_CONSIDER.includes(moduleName) ||
                // dependency is not runtime's
                !packageJson.dependencies.hasOwnProperty(moduleName) &&
                !packageJson.devDependencies.hasOwnProperty(moduleName)
            )
        ) {
            return undefined;
        }

        if (moduleName) {
            // dependency's package.json
            // eslint-disable-next-line security/detect-non-literal-require
            packageJson = require('../node_modules/' + moduleName + '/package.json');
        }

        // set version of dependency
        moduleData.version = packageJson.version;
        moduleData.dependencies = {};

        for (key of PACKAGES_TO_CONSIDER) {
            // version of deep dependency
            version = '';

            // given is normal dependency
            if (packageJson.dependencies.hasOwnProperty(key)) {
                version = packageJson.dependencies[key];
            }
            // given is devDependency
            if (packageJson.devDependencies.hasOwnProperty(key)) {
                version = packageJson.devDependencies[key];
            }

            // no deep deendency with given name
            if (!version) {
                continue;
            }

            // include dependency in module data
            moduleData.dependencies[key] = {
                version: version,
                dependencies: {}
            };

            // recursive call to include deep-dependency
            if (!moduleName && deepDependencies) {
                getModuleData(key, deepDependencies, moduleData.dependencies[key]);
            }

            // delete if no deep-dependency found
            if (Object.keys(moduleData.dependencies[key].dependencies).length === 0) {
                delete moduleData.dependencies[key].dependencies;
            }
        }

        return moduleData;
    };

module.exports = getModuleData;
