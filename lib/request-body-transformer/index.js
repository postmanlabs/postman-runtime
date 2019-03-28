var _ = require('lodash'),
    BodyTransformer;

BodyTransformer = {
    transformers: {},

    get: function (name) {
        return BodyTransformer.transformers[name];
    },

    add: function (Transformer, name) {
        if (!_.isFunction(Transformer && Transformer.parse)) {
            throw new Error('runtime~BodyTransformer: Missing parse function for body transformer - ' +
                name);
        }

        BodyTransformer.transformers[name] = Transformer;
    },

    remove: function (name) {
        if (!BodyTransformer.transformers.hasOwnProperty(name)) {
            throw new Error('runtime~BodyTransformer: Body transformer does not exist - ' + name);
        }

        delete BodyTransformer.transformers[name];
    },

    parseBody: function (body, done) {
        if (!body) {
            return done();
        }

        var parser = BodyTransformer.get(body.type); // don't do `this` here

        if (!parser) {
            return done(new Error('runtime~BodyTransformer: could not find handler for body type ' + body.type));
        }

        parser.parse({
            version: body.version,
            content: body.content,
            params: body.params,
            getResource: function (done) {
                if (_.isFunction(done)) {
                    done(new Error('Not Implemented'));
                }
            }
        }, function (parsed) {
            return done(null, parsed);
        });
    }
};

// load inbuilt transformers
_.forEach({
    graphql: require('./graphql')
}, BodyTransformer.add);

module.exports = {
    BodyTransformer: BodyTransformer
};
