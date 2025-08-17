var sdk = require('postman-collection');

module.exports = {
    process: {
        persist ({ result, payload }, next) {
            console.log('persist command');
            // persist the pm.variables for the next script
            result && result._variables &&
                (payload.context._variables = new sdk.VariableScope(result._variables));

            // persist the pm.variables for the next request
            result && result._variables &&
                (this.state._variables = new sdk.VariableScope(result._variables));

            // persist the mutated request in payload context,
            // @note this will be used for the next prerequest script or
            // upcoming commands(request, httprequest).
            result && result.request && (payload.context.request = result.request);
            next();
        }
    }
};
