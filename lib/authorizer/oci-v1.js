/**
 * @fileOverview
 *
 * Implements the Oracle Cloud Infrastructure Signature v1 authentication method.
 * Specification document: https://docs.cloud.oracle.com/en-us/iaas/Content/API/Concepts/signingrequests.htm
 */

var _ = require('lodash'),
    uuid = require('uuid/v4'),
    crypto = require('crypto'),
    sdk = require('postman-collection'),
    RequestBody = sdk.RequestBody,
    urlEncoder = require('postman-url-encoder'),
    bodyBuilder = require('../requester/core-body-builder');

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
                property: 'Authorization',
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
        done(null, Boolean(auth.get('accessToken') && auth.get('clientToken') && auth.get('clientSecret')));
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
        return done();
    }
};
