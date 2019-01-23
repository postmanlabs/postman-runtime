var RUNTIME_PACKAGE = require('../package.json'),

    /**
     * List of postman packages to include while generating dependency object
     *
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
     * Generate object containing version and dependencies of Runtime or given module.
     *
     * @param {String} [moduleName] - Module name
     * @param {Boolean} [deepDependencies=true] - Do depth dependencies traversal or stop at root
     * @param {Object} [moduleData={}] - Object to store module data
     * @returns {Object}
     *
     * @example <caption>Returned Object Structure</caption>
     * var runtime = require('postman-runtime');
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
    getVersionData = function (moduleName, deepDependencies, moduleData) {
        !moduleData && (moduleData = {});
        (deepDependencies === undefined) && (deepDependencies = true);

        var key,
            version,

            // Runtime's package.json is considered by default
            packageJson = RUNTIME_PACKAGE;

        // bail out if either dependency not in PACKAGES_TO_CONSIDER
        // or not Runtime's dependency
        if (
            moduleName &&
            !(
                PACKAGES_TO_CONSIDER.includes(moduleName) &&
                (
                    packageJson.dependencies.hasOwnProperty(moduleName) ||
                    packageJson.devDependencies.hasOwnProperty(moduleName)
                )
            )
        ) {
            return;
        }

        // if module name is given in function argument, consider that module's package.json instead of default
        if (moduleName) {
            // eslint-disable-next-line security/detect-non-literal-require
            packageJson = require('../node_modules/' + moduleName + '/package.json');
        }

        // set version of dependency given as function argument or Runtime
        moduleData.version = packageJson.version;
        moduleData.dependencies = {};

        for (key of PACKAGES_TO_CONSIDER) {
            // if key is normal dependency
            if (packageJson.dependencies.hasOwnProperty(key)) {
                version = packageJson.dependencies[key];
            }
            // else if key is devDependency
            else if (packageJson.devDependencies.hasOwnProperty(key)) {
                version = packageJson.devDependencies[key];
            }
            // skip if key is not listed as dependency in packageJson
            else {
                continue;
            }

            // include dependency in module data
            moduleData.dependencies[key] = {
                version: version,
                dependencies: {}
            };

            // recursive call to include deep-dependency
            if (!moduleName && deepDependencies) {
                getVersionData(key, deepDependencies, moduleData.dependencies[key]);
            }

            // delete if no deep-dependency found
            if (Object.keys(moduleData.dependencies[key].dependencies).length === 0) {
                delete moduleData.dependencies[key].dependencies;
            }
        }

        return moduleData;
    };

module.exports = getVersionData;
