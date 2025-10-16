const runtime = require('./index');
const {Collection} = require("postman-collection");

var runner = new runtime.Runner(); // runtime = require('postman-runtime');

runner.run(new Collection({
    item: [{
        request: {
            url: 'tarentella.dev.mybazaar.co.in/assets/tree-shakable-vendor-2-D_qjPGPi.js',
            method: 'GET',
            body: {
                mode: 'raw',
                raw: 'POSTMAN'
            }
        },
        // event: [{
        //     listen: 'prerequest',
        //     script: {
        //         exec: [
        //             'pm.sendRequest({ url: "https://postman-echo.com/get" });'
        //         ],
        //         type: 'text/javascript'
        //     }
        // }]
    }]
}), {
    protocolProfileBehavior: {
        protocolVersion: 'http1',
        followRedirects: true,

    },
    debug: {
        sslKeyLogFile: 'ssl-key-log.txt'
    }
},function (err, run) {
    run.start({
        // Called any time we see a new assertion in the test scripts
        assertion: function (cursor, assertions) {
            // cursor = {
            //     position: Number,
            //     iteration: Number,
            //     length: Number,
            //     cycles: Number,
            //     eof: Boolean,
            //     empty: Boolean,
            //     bof: Boolean,
            //     cr: Boolean,
            //     ref: String,
            //     scriptId: String,
            //     eventId: String
            // }

            // assertions: array of assertion objects
            // assertion: {
            //     error: Error,
            //     index: Number,
            //     name: String,
            //     skipped: Number,
            //     passed: Number
            // }
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
            console.log('start');
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
        item: function (err, cursor, item, visualizer, result) {
            // err, cursor, item: Same as arguments for "beforeItem"

            // visualizer: null or object containing visualizer result that looks like this:
            //  {
            //      -- Tmeplate processing error
            //      error: <Error>
            //
            //      -- Data used for template processing
            //      data: <Object>
            //
            //      -- Processed template
            //      processedTemplate: <String>
            //  }

            // result: undefined or object containing following properties
            // {
            //      -- True for items skipped using pm.execution.skipRequest
            //         isSkipped: <Boolean>
            // }

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
            console.log('beforeRequest');
            // err, cursor: Same as arguments for "start"
            // item: sdk.Item

            // request: sdk.request
        },

        // Called just after sending a request, may include request replays
        request: function (err, cursor, response, request, item, cookies, history) {
            // err, cursor: Same as arguments for "start"
            // item: sdk.Item
            console.log('request');

            // response: sdk.Response
            // request: sdk.request
        },

        // Called just after receiving the request-response without waiting for
        // the response body or, request to end.
        // Called once with response for each request in a collection
        responseStart: function (err, cursor, response, request, item, cookies, history) {
            // err, cursor: Same as arguments for "start"
            // item: sdk.Item
            console.log('responseStart');
            // response: sdk.Response
            // request: sdk.request
        },

        // Called every time a complete server-sent event is received
        responseData: function (cursor, data) {
            console.log('responseData');
            // cursor - Same as arguments for "start"
            // data - Event buffer.
        },

        // Called once with response for each request in a collection
        response: function (err, cursor, response, request, item, cookies, history) {
            console.log('response', response.downloadedBytes);
            // err, cursor: Same as arguments for "start"
            // item: sdk.Item

            // response: sdk.Response
            // request: sdk.request
        },

        exception: function (cursor, err) {
            // Called when an exception occurs
            // @param {Object} cursor - A representation of the current run state.
            // @param {Error} err - An Error instance with name, message, and type properties.
            console.log(err);
        },

        // Called at the end of a run
        done: function (err) {
            // err: null or Error
            console.log('done');
        },

        // Called any time a console.* function is called in test/pre-request scripts
        console: function (cursor, level, ...logs) {},

        io: function (err, cursor, trace, ...otherArgs) {
            // err, cursor: Same as arguments for "start"
            // trace: An object which looks like this:
            // {
            //     -- Indicates the type of IO event, may be HTTP, File, etc. Any requests sent out as a part of
            //     -- auth flows, replays, etc will show up here.
            //     type: 'http',
            //
            //     -- Indicates what this IO event originated from, (collection, auth flows, etc)
            //     source: 'collection'
            // }
            // otherArgs: Variable number of arguments, specific to the type of the IO event.

            // For http type, the otherArgs are:
            // response: sdk.Response()
            // request: sdk.Request()
            // cookies: Array of sdk.Cookie()
        }
    });
});


