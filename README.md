# postman-runtime

> This repository has not yet been updated with code and tests for production use.
>
> If you are looking to execute collections, you should bee using [Newman](https://github.com/postmanlabs/newman)

## Development Notes

- `npm run test`: Runs lint, system, unit and integration tests of runtime
- `npm run test-integration-newman`: This command runs tests of newman with the under-development variant of runtime

## Options

```
var runner = new Runner();

runner.run(collection, {
    // Iteration Data
    data: [],
    
    // Timeouts (in ms)
    timeout: {
        request: 30000,
    },
    
    // Number of iterations
    iterationCount: 1,

    // Control flags (you can only specify one of these):
    
    // - gracefully halts on errors (errors in request scripts or while sending the request)
    //   calls the `item` and `iteration` callbacks and does not run any further items (requests)
    stopOnError: true,
    
    // - abruptly halts the run on errors, and directly calls the `done` callback
    abortOnError: true,
    
    // - gracefully halts on errors _or_ test failures.
    //   calls the `item` and `iteration` callbacks and does not run any further items (requests)
    stopOnFailure: true,

    // - abruptly halts the run on errors or test failures, and directly calls the `done` callback
    abortOnFailure: true,
    
    // Environment (a "VariableScope" from the SDK)
    environment: env,
    
    // Globals (a "VariableScope" from the SDK)
    globals: {},
    
    // Configure delays (in ms)
    delay: {
        // between each request
        item: 1000,
        // between iterations
        iteration: 1000
    },

    // Used to fetch contents of files, certificates wherever needed
    fileResolver: require('fs'),
    
    // Options specific to the requester
    requester: {
        
        // An object compatible with the cookieJar provided by the 'postman-request' module
        cookieJar: jar,
        
        // Controls redirect behavior (only supported on Node, ignored in the browser
        followRedirects: true,

        // Enable or disable certificate verification
        strictSSL: false,
        
        // Enable sending of bodies with GET requests
        sendBodyWithGetRequests: true,
    },

    // A ProxyConfigList, from the SDK
    proxies: new ProxyConfigList(),
    
    // A function that fetches the system proxy for a given URL.
    systemProxy: function (url, callback) { return callback(null, {/* ProxyConfig object */}) },
    
    // A CertificateList from the SDK
    certificates: new CertificateList(),
    
    // *note* Not implemented yet.
    // In the future, this will be used to read certificates from the OS keychain.
    systemCertificate: function() {}
}, function (err, run) {
    console.log('Created a new Run!');

    run.start({
        assertion: function (name, result) { },
        start: function (err, cursor) { },
        beforeIteration: function (err, cursor) { },
        iteration: function (err, cursor) { },
        beforeItem: function (err, cursor, item) { },
        item: function (err, cursor, item) { },
        beforePrerequest: function (err, cursor, events, item) { },
        prerequest: function (err, cursor, results, item) { },
        beforeTest: function (err, cursor, events, item) { },
        test: function (err, cursor, results, item) { },
        beforeRequest: function (err, cursor, request, item) { },
        request: function (err, cursor, response, request, item, lres, lreq) { },
        done: function (err) {
            console.log('done');
        },
        console: function (cursor, level, ...logs) { }
    });
});
```
