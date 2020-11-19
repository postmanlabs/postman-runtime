/**
 * @fileOverview
 *
 * Implements the Oracle Cloud Infrastructure Signature v1 authentication method.
 * Specification document: https://docs.cloud.oracle.com/en-us/iaas/Content/API/Concepts/signingrequests.htm
 */

var oci = require('oci-common'),
    convertPostmanRequestToOCIRequest = function (request) {
        // need to convert request from `module:postman-collection.Request`
        // to oci-common/lib/http-request.d.ts.HttpRequest
        return {
            uri: request.url,
            headers: request.headers, // TODO: Convert to DOM headers class
            method: request.method,
            body: request.body // TODO: Convert to supported format
        };
    };

/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     */
    // TODO: Fix the manifest
    manifest: {
        info: {
            name: 'oci-v1',
            version: '1.0.0'
        },
        updates: [
            {
                property: 'authorization',
                type: 'header'
            }
        ]
    },

    /**
     * Initializes a item (fetches all required parameters, etc) before the actual authorization step.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {Response} response Response of intermediate request (it any)
     * @param {AuthHandlerInterface~authInitHookCallback} done Callback function called with error as first argument
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Checks the item, and fetches any parameters that are not already provided.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {AuthHandlerInterface~authPreHookCallback} done Callback function called with error, success and request
     */
    pre: function (auth, done) {
        // TODO: Check the right params
        // config = from_file()
        // auth = Signer(
        //     tenancy=config['tenancy'],
        //     user=config['user'],
        //     fingerprint=config['fingerprint'],
        //     private_key_file_location=config['key_file'],
        // )
        done(null, Boolean(auth.get('tenancy') && auth.get('user') &&
            auth.get('fingerprint') && auth.get('private_key')));
    },

    /**
     * Verifies whether the request was successful after being sent.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {Requester} response Response of the request
     * @param {AuthHandlerInterface~authPostHookCallback} done Callback function called with error and success
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth AuthInterface instance created with request auth
     * @param {Request} request Request to be sent
     * @param {AuthHandlerInterface~authSignHookCallback} done Callback function
     */
    sign: function (auth, request, done) {
        // TODO: Implement logic
        let provider = new oci.SimpleAuthenticationDetailsProvider(
                auth.get('tenancy'), auth.get('user'), auth.get('fingerprint'), auth.get('private_key')
            ),
            signer = new oci.DefaultRequestSigner(provider),
            ociRequest = convertPostmanRequestToOCIRequest(request);

        signer.signHttpRequest(ociRequest).then(function () {
            request.headers.add({
                key: 'authorization',
                value: ociRequest.headers.get('authorization'),
                system: true
            });

            done(null);
        }
        ).catch(function (err) {
            done(new Error('Unable to sign'));
        });
    }
};
