module.exports = {
    manifest: {
        info: {
            name: 'graphql',
            version: '1.0.0'
        }
    },

    parse: function (body, done) {
        if (typeof body.params.variables === 'string') {
            try {
                body.params.variables = JSON.parse(body.params.variables);
            }
            catch (e) {
                body.params.variables = undefined;
            }
        }

        return done(JSON.stringify({
            query: body.content,
            operationName: body.params.operationName && String(body.params.operationName),
            variables: body.params.variables
        }));
    }
};
