const server = require('./_servers');

module.exports = server.createGraphQLServer({
    schema: `
        type Query {
            hello: String,
            square(n: Int!): Int
        }
    `,
    root: {
        hello: function () {
            return 'Hello world!';
        },
        square: function (args) {
            return args.n * args.n;
        }
    }
});
