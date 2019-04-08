# Adding New Request Body Mode

This document outlines the steps to be done to add a new body mode in Runtime and SDK.

## Adding mode to SDK

* In `postman-collection/lib/collection/request-body.js`
* Add new mode in [RequestBody.MODES](https://github.com/postmanlabs/postman-collection/blob/v3.4.6/lib/collection/request-body.js#L175) object.
* Finally, set the content of new mode to `RequestBody` via [RequestBody#update](https://github.com/postmanlabs/postman-collection/blob/v3.4.6/lib/collection/request-body.js#L36) method.
    * Verify `RequestBody`'s `toString` and `isEmpty` method works as expected for the new mode.

## Adding mode to Runtime

* In `postman-runtime/lib/requester/core-body-builder.js`
* [Add](https://github.com/postmanlabs/postman-runtime/blob/v7.11.0/lib/requester/core-body-builder.js#L108) new mode's body transformation function.
    * The function will be triggered based on the selected mode.
    * This function has access to the request body content as well as the actual `PostmanRequest` instance.
* Add body transformation logic and return an object with expected `postman-request` properties. `{ body: transformedContent }`
* Optionally add `system` headers (say `Content-Type`) to the `PostmanRequest` instance.
