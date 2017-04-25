# postman-runtime

> This is a low-level library used as the backbone for all Collection running & Request sending functionality, in 
> the Postman App, and allied systems ([Postman Monitoring](), [Newman](https://github.com/postmanlabs/newman))

> If you are looking to execute collections, you should be using Newman, this is very low level.

## Development Notes

- `npm run test`: Runs lint, system, unit and integration tests of runtime
- `npm run test-integration-newman`: This command runs tests of newman with the under-development variant of runtime

## Options

Postman Runtime supports a lot of options to customize its behavior for different environments and use-cases. 

```javascript
var runner = new runtime.Runner(); // runtime = require('postman-runtime');

// a collection object constructed using the Postman Collection SDK.
var collection = new sdk.Collection();

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
    environment: new sdk.VariableScope(),
    
    // Globals (a "VariableScope" from the SDK)
    globals: new sdk.VariableScope(),
    
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
        
        // Controls redirect behavior (only supported on Node, ignored in the browser)
        followRedirects: true,

        // Enable or disable certificate verification (only supported on Node, ignored in the browser)
        strictSSL: false,
        
        // Enable sending of bodies with GET requests (only supported on Node, ignored in the browser)
        sendBodyWithGetRequests: true,
    },

    // A ProxyConfigList, from the SDK
    proxies: new sdk.ProxyConfigList(),
    
    // A function that fetches the system proxy for a given URL.
    systemProxy: function (url, callback) { return callback(null, {/* ProxyConfig object */}) },
    
    // A CertificateList from the SDK
    certificates: new sdk.CertificateList(),
    
    // *note* Not implemented yet.
    // In the future, this will be used to read certificates from the OS keychain.
    systemCertificate: function() {}
}, function (err, run) {
    console.log('Created a new Run!');

    // Check the section below for detailed documentation on what callbacks should be.
    run.start(callbacks); 
});
```

## Callbacks

You can pass a series of callbacks for runtime to execute as a collection is being executed.

```javascript
runner.run(collection, { /* options */ }, function(err, run) {
    run.start({
        // Called any time we see a new assertion in the test scripts
        // *note* Not used yet.
        assertion: function (name, result) {
            // name: string
            // result: Boolean
        },
        
        // Called when the run begins
        start: function (err, cursor) {
            // err: null or Error
            // cursor = {
            //     position: Number,
            //     iteration: Number, 
            //     length: Number,
            //     cycles: Number,
            //     eof: Boolean,
            //     empty: Boolean,
            //     bof: Boolean,
            //     cr: Boolean,
            //     ref: String
            // }
        },
        
        // Called before starting a new iteration
        beforeIteration: function (err, cursor) { 
            /* Same as arguments for "start" */ 
        },
        
        // Called when an iteration is completed
        iteration: function (err, cursor) {
            /* Same as arguments for "start" */ 
        },
        
        // Called before running a new Item (check the postman collection v2 format for what Item means)
        beforeItem: function (err, cursor, item) {
            // err, cursor: Same as arguments for "start"
            // item: sdk.Item
        },
        
        // Called after completion of an Item
        item: function (err, cursor, item) {
            /* Same as arguments for "beforeItem" */
        },
        
        // Called before running pre-request script(s) (Yes, Runtime supports multiple pre-request scripts!)
        beforePrerequest: function (err, cursor, events, item) {
            // err, cursor: Same as arguments for "start"
            // events: Array of sdk.Event objects
            // item: sdk.Item
        },
        
        // Called after running pre-request script(s)
        prerequest: function (err, cursor, results, item) { 
            // err, cursor: Same as arguments for "start"
            // item: sdk.Item
            
            // results: Array of objects. Each object looks like this:
            //  {
            //      error: Error,
            //      event: sdk.Event,
            //      script: sdk.Script,
            //      result: {
            //          target: 'prerequest'
            //
            //          -- Updated environment
            //          environment: <VariableScope>
            //
            //          -- Updated globals
            //          globals: <VariableScope>
            //
            //          data: <Object of data variables>
            //          return: <Object, contains set next request params, etc>
            //      }
            //  }
        },
        
        // Called before running test script(s)
        beforeTest: function (err, cursor, events, item) {
            // err, cursor: Same as arguments for "start"
            // events: Array of sdk.Event objects
            // item: sdk.Item
        },
        
        // Called just after running test script (s)
        test: function (err, cursor, results, item) {
            // results: Array of objects. Each object looks like this:
            //  {
            //      error: Error,
            //      event: sdk.Event,
            //      script: sdk.Script,
            //      result: {
            //          target: 'test'
            //
            //          -- Updated environment
            //          environment: <VariableScope>
            //
            //          -- Updated globals
            //          globals: <VariableScope>
            //
            //          response: <sdk.Response>
            //          request: <sdk.Request>
            //          data: <Object of data variables>
            //          cookies: <Array of "sdk.Cookie" objects>
            //          tests: <Object>
            //          return: <Object, contains set next request params, etc>
            //      }
            //  }
        },
        
        // Called just before sending a request
        beforeRequest: function (err, cursor, request, item) {
            // err, cursor: Same as arguments for "start"
            // item: sdk.Item
            
            // request: sdk.request
        },
        
        // Called just after sending a request
        request: function (err, cursor, response, request, item, cookies) {
            // err, cursor: Same as arguments for "start"
            // item: sdk.Item
            
            // response: sdk.Response
            // request: sdk.request
        },
        
        // Called at the end of a run
        done: function (err) {
            // err: null or Error
            console.log('done');
        },
        
        // Called any time a console.* function is called in test/pre-request scripts
        console: function (cursor, level, ...logs) {}
    });
});
```
