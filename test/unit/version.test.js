var expect = require('chai').expect,
    runtimePackage = require('../../package.json'),
    sandboxPackage = require('../../node_modules/postman-sandbox/package.json'),
    collectionPackage = require('../../node_modules/postman-collection/package.json'),
    runtime = require('../../');

(typeof window === 'undefined' ? describe : describe.skip)('version', function () {
    var moduleData = {
            version: runtimePackage.version,
            dependencies: {
                'postman-collection': {
                    version: runtimePackage.dependencies['postman-collection'],
                    dependencies: {
                        'postman-request': {
                            version: collectionPackage.devDependencies['postman-request']
                        }
                    }
                },
                'postman-request': {
                    version: runtimePackage.dependencies['postman-request']
                },
                'postman-sandbox': {
                    version: runtimePackage.dependencies['postman-sandbox'],
                    dependencies: {
                        uvm: {
                            version: sandboxPackage.dependencies.uvm
                        },
                        'chai-postman': {
                            version: sandboxPackage.devDependencies['chai-postman']
                        },
                        'postman-collection': {
                            version: sandboxPackage.devDependencies['postman-collection']
                        },
                        uniscope: {
                            version: sandboxPackage.devDependencies.uniscope
                        }
                    }
                }
            }
        },
        moduleDataNotNested = {
            version: runtimePackage.version,
            dependencies: {
                'postman-collection': {
                    version: runtimePackage.dependencies['postman-collection']
                },
                'postman-request': {
                    version: runtimePackage.dependencies['postman-request']
                },
                'postman-sandbox': {
                    version: runtimePackage.dependencies['postman-sandbox']
                }
            }
        };

    it('should expose correct runtime version', function () {
        expect(runtime.version().version).to.eql(moduleData.version);
    });

    it('should expose correct dependencies tree', function () {
        expect(runtime.version().dependencies).to.eql(moduleData.dependencies);
    });

    it('should expose specific module data', function () {
        expect(runtime.version('postman-collection')).to.eql(moduleData.dependencies['postman-collection']);
    });

    it('should return undefined for dependencies which are not direct dependency of runtime', function () {
        expect(runtime.version('chai-postman')).to.eql(undefined);
    });

    it('should return undefined for dependency that are not from Postman', function () {
        expect(runtime.version('express')).to.eql(undefined);
    });

    it('should not include nested dependencies', function () {
        expect(runtime.version(undefined, false)).to.eql(moduleDataNotNested);
    });
});
