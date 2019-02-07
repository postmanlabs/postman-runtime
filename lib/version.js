var _ = require('lodash'),
    RUNTIME_PACKAGE = require('../package.json'),

    /**
     * List of postman packages to include while generating dependency object
     *
     * @const
     * @type {String[]}
     */
    PACKAGES_TO_CONSIDER = {
        'chai-postman': true,
        'postman-collection': true,
        'postman-request': true,
        'postman-sandbox': true,
        'uniscope': true,
        'uvm': true
    },

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
        // Set default values of function arguments if not given
        // @note Argument moduleData is undefined if function is called directly.
        // Otherwise moduleData will contain object if called recursively.
        !moduleData && (moduleData = {});

        // Include nested dependencies in moduleData object only if deepDependencies=true.
        // Return only direct dependencies of module if deepDependencies=false.
        (deepDependencies === undefined) && (deepDependencies = true);

        var version,

            // Runtime's package.json is considered by default
            packageJson = RUNTIME_PACKAGE;

        // bail out if either dependency not in PACKAGES_TO_CONSIDER
        // or not Runtime's dependency
        if (
            moduleName &&
            !(
                PACKAGES_TO_CONSIDER[moduleName] &&
                (
                    _.has(packageJson, ['dependencies', moduleName]) ||
                    _.has(packageJson, ['devDependencies', moduleName])
                )
            )
        ) {
            return;
        }

        // if module name is given in function argument, consider that module's package.json instead of default
        if (moduleName) {
            // eslint-disable-next-line security/detect-non-literal-require
            packageJson = require(require.resolve(`${moduleName}/package.json`));
        }

        // set version of dependency given as function argument or Runtime
        moduleData.version = packageJson.version;
        moduleData.dependencies = {};

        _.forEach(PACKAGES_TO_CONSIDER, function (value, key) {
            // if key is normal dependency
            if (_.has(packageJson, ['dependencies', key])) {
                version = packageJson.dependencies[key];
            }
            // else if key is devDependency
            else if (_.has(packageJson, ['devDependencies', key])) {
                version = packageJson.devDependencies[key];
            }
            // skip if key is not listed as dependency in packageJson
            else {
                return;
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
            if (!_.size(moduleData.dependencies[key].dependencies)) {
                delete moduleData.dependencies[key].dependencies;
            }
        });

        return moduleData;
    };

module.exports = getVersionData;
