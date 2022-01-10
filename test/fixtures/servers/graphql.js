const server = require('./_servers');

module.exports = server.createGraphQLServer({
    schema: `
        type Query {
            hello: String,
            square(n: Int!): Int
        }
    `,
    root: {
        hello () {
            return 'Hello world!';
        },
        square (args) {
            return args.n * args.n;
        }
    }
});
