var runtime = require('.'),
    sdk = require('postman-collection');

var collection = new sdk.Collection({
    item: {
        name: 'Google',
        request: {
            url: 'https://google.com/'
        }
    }
});

var runner = new runtime.Runner();

runner.run(collection, {
        requester:{
            timings: true,
        }
    }, function (err, run) {

        console.log('Created new run.');

        run.start({
            start: (err, cursor) => {
                console.log('Run started');
            },

            response: (err, cursor, res, request, item, cookies) => {
                // console.log(err);
                // console.log(sdk.Response.timingPhases(res.timings));
            },
    });
});
