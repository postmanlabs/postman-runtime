# Postman Runtime Changelog

### v7.2.0 (June 30, 2018)
* Added support for variable change tracking in scripts. Variable scopes in `result` of script callbacks like `script`, `test` and `prerequest` will now have a `mutations` object. This contains only the mutations made within that script, if any.
* Updated dependencies

#### v7.1.6 (May 24, 2018)
* Updated dependencies
* Updated `postman-request` to `v2.86.1-postman.1`, which fixes https://nodesecurity.io/advisories/664

#### v7.1.5 (April 10, 2018)
* #565 Updated `postman-sandbox` to `v3.0.6`.

#### v7.1.4 (April 9, 2018)
* Updated dependencies :arrow_up:
* #563 Updated `postman-sandbox` to `v3.0.5`, which fixes assertion centric bugs :bug:
* #554 Updated `postman-request` to `v2.85.1-postman.1`, which fixes https://nodesecurity.io/advisories/566 :lock:.
* #553 Fixed a bug that prevented JavaScript keywords from being used as keys in request bodies. :bug:

#### v7.1.3 (January 2, 2018)
* #510 Updated `postman-request` to `v2.81.1-postman.4`, which contains a formdata `RangeError` bugfix.
* #480 Removed blacklisting of headers for aws auth. All the headers are now included in the signature calculation.

#### v7.1.2 (December 8, 2017)
* Updated dependencies :arrow_up:
* #500 Fixed entrypoint detection error :bug:
* #498 Cleared OAuth2 state conflicts for duplicate parameters :bug:
* #490 Switched to variable lists from POJOs :racehorse:
* #492 Removed redundant AWS auth region fallback :bug:
* #491 Updated entrypoint documentation :srcoll:
* #487 Accelerated memory leack checker script :racehorse:

#### v7.1.1 (November 30, 2017)
* Dropped support for legacy `serviceName` property in `aws` auth.
* :arrow_up: Updated dependencies.

#### v7.1.0 (November 21, 2017)
* Runtime now adds `system: true` to all the query parameters that it sets
* More useful error messages for assertion failures in legacy `tests`
* Digest auth does not attempt retries for invalid credentials/configuration. It will continue to retry for missing configuration.
* Auth will maintain it's state across a collection run. Digest auth no longer needs to send 2 requests for every digest auth protected item in a collection
* Added support for custom DNS lookup
* [Breaking] `restrictedAddresses` option is now moved to `network` option
    - In v7.0.0
        ```js
        runner.run(collection, {
            restrictedAddresses: {'x.x.x.x': true}
        }});
        ```
    - In v7.1.0
        ```js
        runner.run(collection, {
            network: {
                restrictedAddresses: {'x.x.x.x': true}
            }
        }});
        ```

#### v7.0.1 (November 8, 2017)
* :bug: Fixed a bug where the assertions for legacy `tests` failures did not have an `error` object.
* :arrow_up: Updated dependencies

#### v7.0.0 (November 7, 2017)

* [BREAKING] #453 #447 Added default timeout value to 3 min.
    - Timeout options take a positive value in milliseconds. e.g.
        ```javascript
        runner.run(collection, { timeout: {
            global: 5 * 60 * 1000, // total timeout of 5 minutes
            request: 500, // timeout for individual requests
            script: 200 // timeout for individual scripts
        } });
        ```
    - If you are increasing the default timeout for `script`/`request`, make sure `global` timeout is sufficiantly larger than that.
    - Use `0` for no timeout (infinite timeout).
* [BREAKING] The signature for `assertion` and `test` callbacks have changed.
    - The `assertion` callback is now passed with an array of assertions.
    - All assertions, both `pm.test` and legacy `tests` global are now available in the `assertion` callback.
    - The legacy `tests` are no longer available in results parameter in `test` callback.
* [BREAKING] #427 The `entrypoint` option now supports selecting requests as well as folders
    - To execute a folder/request using id or name
    ```javascript
    runner.run(collection, { entrypoint: {
        execute: `${desiredIdOrName}`,
        lookupStrategy: 'idOrName'
    }});
    ```
    - To execute a folder/request using a path
    ```javascript
    runner.run(collection, { entrypoint: {
        execute: `${desiredId}`,
        lookupStrategy: 'path',
        path: ['grand_parent_folder_id', 'parent_folder_id']
    }});
    ```
* [BREAKING] #428 Advanced auth flows are now enabled by default(`interactive` flag has been removed)
* :tada: #424 Added support for collection level variables, collection/folder level authentication and scripts
* :arrow_up: Updated dependencies
* :bug: Invalid values in `entrypoint` now results in an error (when `abortOnError` is set to `true`)

#### v6.4.2 (November 2, 2017)
* :arrow_up: Updated dependencies.
* #435 Added option to blacklist certain IP addresses from being hit :lock:
* #436 Improved HTTP request error handling :muscle:

#### v6.4.1 (October 13, 2017)
* :arrow_up: Updated dependencies.
* :bug: Made Bearer token case insensitive #417

#### v6.4.0 (September 28, 2017)
* Improved flows for NTLM, Digest, and OAuth2 :tada:
* #382 Added script timeout option :tada:
* #408 Prevented max replay errors from bubling up :bug:
* #394 Refurbished interactive mode for auth :tada:
* #400 Fixed digest-md5-sess :bug:
* #402 Fix OAuth1 camelcased timestamp :bug:
* #350 Fixed abort-after-pause :bug:
* #386 Added support for bearer-token auth :tada:
* #373 Added response callback :tada:
* #360 Shifted the auth sign function from the Collection SDK.
* #368 All new auth-interface :tada:
* #367 Made basic-auth username optional :tada:
* #366 Documented exception callback :scroll:

#### v6.3.1-2 (August 28, 2017)
* :bug: Prevented empty/missing request urls from crashing `pm.sendRequest` #361

#### v6.3.0 (August 21, 2017)
* :arrow_up: Updated `postman-sandbox` to `v2.3.2`, which contains a header assertion bugfix. #358

#### v6.2.6 (August 18, 2017)
* Updated dependencies :arrow_up:
* Bumped Collection SDK to `v2.1.1` and Sandbox to `v2.3.1`. #353, #354
* :lock: Prevented files from being uploaded via `pm.sendRequest` #351
* Queued `pm.sendRequest` through the request command, emitted the `request` event. #345
* :scroll: Expanded documentation for the `assertion` event. #342
* Ensured that the `tunnel` value is set from the request protocol. #327
* Prevented headers with falsy keys from being sent with requests. #337

#### 6.2.5 (July 19, 2017)
* :bug: Fixed a regression that prevented cookies from being passed across requests. #323

#### 6.2.4 (July 11, 2017)
* Fixed a bug that prevented the `Content-Length` header from being set for file uploads in `binary` mode.

#### 6.2.3 (July 5, 2017)
* Support for updated `ProxyConfig` from Collection SDK v2.0.0
* Custom proxies now have higher preference than system proxies

#### 6.2.2 (June 28, 2017)
* Bumped Postman Sandbox to v2.3.0, which includes support for synchronous csv-parse #298
* Bumped Postman Collection SDK to v1.2.9, with critical bugfixes. #297
* Updated other dependencies

#### 6.2.1 (June 23, 2017)
* Fixed a bug which caused auth variables to not be resolved when sending requests

#### 6.2.0 (June 15, 2017)
* Updated dependencies, pruned lodash3
* Added support for authorization mechanisms #233
* Added suport for NTLM auth #266
* Runtime now supports another event, `io`, which provides information about intermediate requests that may be sent
  as part of authentication or other flows.

    ```javascript
    io: function inputOutput (err, cursor, trace, ...otherArgs) {
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
    }
    ```
* Used updated Sandbox with momentjs included #281

#### 6.1.6 (May 16, 2017)
* Updated `postman-sandbox` to `v2.1.5`.

#### 6.1.5 (May 15, 2017)
* Updated `postman-sandbox` to `v2.1.4`, which uses `postman-collection@1.2.5`

#### 6.1.4 (May 12, 2017)
* Updated `postman-sandbox` to v2.1.3 and `postman-collection` to v1.2.5, which introduce `pm.variables` in the scripts

#### 6.1.3 (May 09, 2017)
* Updated `postman-collection` to v1.2.4, which contains a bugfix for response size calculation

#### 6.1.2 (May 08, 2017)
* Ensure that we do not stop the request from being sent if there are errors loading certificates or proxies

#### 6.1.1 (May 08, 2017)
* Fixed the behavior for `beforeRequest` and `request` triggers
* Updated `postman-collection` to v1.2.3, which contains bugfixes for OAuth1, and addition of some helper methods

#### 6.1.0 (April 25, 2017)
* Initial version of `pm` API in the sandbox

#### 6.0.1 (April 10, 2017)
* Fixed a bug that caused script run results to be sent as `POJO`s instead of `VariableScope` instances.

#### 6.0.0 (April 05, 2017)
* Updated `postman-collection` to v1.1.0, which contains a bugfix for handling multi-valued response headers
* The structure of script run results has changed

        // v5.x
        run.start({
            prerequest: function (err, cursor, results, item) {
                var result = results[0].result // changed
                // 1. result.masked is removed
                // 2. result.globals now actually holds postman Global VariableScope
                // 3. result.globals.* have now been moved to result.*
            },
            test: function (err, cursor, results, item) {
                var result = results[0].result // changed (see below for changes)
                // 1. result.masked is removed
                // 2. result.globals now actually holds postman Global VariableScope
                // 3. result.globals.* have now been moved to result.*
            }
        });

        // v6.x
        run.start({
            prerequest: function (err, cursor, results, item) {
                // results[0].result now has the following structure:
                // {
                //     target: 'prerequest'
                //     environment: <VariableScope>
                //     globals: <VariableScope>
                //     data: <Object of data variables>
                //     return: <contains set next request params, etc>
                // }
            },
            test: function (err, cursor, results, item) {
                // results[0].result now has the following structure:
                // {
                //     target: 'test'
                //     environment: <VariableScope>
                //     globals: <VariableScope>
                //     response: <Response>
                //     request: <Request>
                //     data: <Object of data variables>
                //     cookies: <Array of "Cookie">
                //     tests: <Object>
                //     return: <contains set next request params, etc>
                // }
            }
        });
* The deprecated parameters for `legacyRequest` & `legacyResponse` are no longer provided in the `request` event. Instead, the API now provides `cookies`

        // v5.x
        run.start({
            request: function (err, cursor, response, request, item, legacyResponse, legacyRequest) {
                // do something
            }
        });

        // v6.x
        run.start({
            request: function (err, cursor, response, request, item, cookies) {
                // you now get Cookies as the last parameter!
            }
        });

#### 5.0.0 (March 16, 2017)
* CertificateManager is no longer supported, in favor of certificate list:

        // v4.x
        var runner = new Runner();

        runner.run(collection, {
           requester: {
               certificateManager: myCertManager
           }
        });

        // v5.x
        var runner = new Runner();

        runner.run(collection, {
            certificates: new sdk.CertificateList(/* list */)
        });

* Proxy handling

        // v4.x
        var runner = new Runner();

        runner.run(collection, {
            requester: {
                proxyManager: myProxyManager
            }
        });

        // v5.x
        var runner = new Runner();

        runner.run(collection, {
            // Resolves system proxy
            systemProxy: function (url, callback) {
                return callback(null, new ProxyConfig());
            },
            // static list
            proxies: new ProxyConfigList(/* list */)
        });

* File resolver (or reader)

        // v4.x
        var runner = new Runner();

        runner.run(collection, {
            requester: {
                fileResolver: require('fs')
            }
        });

        // v5.x
        var runner = new Runner();

        runner.run(collection, {
            fileResolver: require('fs')
        });

#### 4.1.1 (March 14, 2017)
* Fixed a bug which caused certificate resolution to return empty content
* Ensure that proxy lookups return a falsey value by default
* Updated the version of `postman-sandbox` to v1.0.2, which contains a bugfix for undefined values in `tests` object of the sandbox.

#### 4.1.0 (March 07, 2017)
* Updated `lodash` to v4.x
* Updated `postman-collection` to v1.0
* Use `CertificateList` to resolve certificates if provided

#### 4.0.4 (February 20, 2017)
* Support for multilevel folders
* Updated `postman-collection` to v0.5.12 which contains minor improvements

#### 4.0.3 (January 31, 2017)
* Updated `postman-collection` to v0.5.11 which contains bugfixes for UTF-8 responses, and variables in URL host
* Updated `postman-request` which contains a bugfix for URL parameter encoding

#### 4.0.2 (January 06, 2017)
* Updated postman-sandbox to v1.0.1 which fixes issue with runtime not initialising in early Node v4.x

#### 4.0.1 (Janurary 02, 2017)
* Improved the proxy handling logic, it now relies on the SDK for correct resolution
* Runtime no longer accepts a `proxyManager`, which is a breaking change

#### 4.0.0 (December 29, 2016)
* Removed the UVM, and started using `postman-sandbox` for script execution, which has memory and performance improvements

#### 3.0.10 (December 15, 2016)
* Fixed a bug which caused no headers to be set in the Browser requester

#### 3.0.9 (December 14, 2016)
* Do not try to set Host and User-Agent headers when sending requests through Chrome
* Ensure that we do not flood the console with warnings about unsupported options

#### 3.0.8 (December 09, 2016)
* Fixed a bug which caused the `done` event callback to be called twice on timeouts

#### 3.0.7 (November 30, 2016)
* Fixed a bug which caused the cookieJar to be overridden even if it is provided

#### 3.0.6 (November 29, 2016)
* Ensure that we use a default cookiejar in case one is not provided, so that they are available in tests

#### 3.0.5 (November 17, 2016)
* Updated `postman-collection` to v0.5.7 (contains a bugfix for handling disabled form parameters)
* Ensure that the disabled parameters are not sent
* Use [lodash3](https://www.npmjs.com/package/lodash3) instead of vanilla lodash

#### 3.0.4 (November 17, 2016)
* Updated the version of `postman-request` which now conforms to WHATWG's URL specification, and correctly encodes URL parameters

#### 3.0.3 (November 09, 2016)
* Updated the version of `postman-request`, which contains a fix for invalid URL param encoding

#### 3.0.2 (October 14, 2016)
* Updated the version of `postman-collection`, which contains a fix for Hawk authentication

#### 3.0.1 (October 13, 2016)
* Ensure that the http reason phrase is bubbled up from the response

#### 3.0.0 (October 10, 2016)
* [Breaking] Changed the runtime API to receive a VariableScope instead of plain object for environments and globals
* Restricted scopes of test and pre-request scripts

#### 2.5.4 (September 28, 2016)
* Fixed a bug with comma's not being escaped in query strings

#### 2.5.3 (September 26, 2016)
* Changed runtime behavior ro allow access to the `window` object on browsers
* Fixed a bug that caused 'false' to not be cast to a string in the sandbox
* Ensure that correct request headers are given out from runtime

#### 2.5.2 (September 21, 2016)
* Updated version of `postman-collection`, which contains bugfixes for AWS Auth and file uploads

#### 2.5.1 (September 16, 2016)
* Fixed a bug that caused utf-8 values to not be encoded properly
* Updated SDK version to 0.5.0 which contains fixes for AWS auth and OAuth1

#### 2.5.0 (September 12, 2016)
* Optimized memory usage by evaluating SugarJS only once per run
* Added a workaround for Windows, where the localhost detection for IPv6 was not working correctly in some cases

#### 2.4.5 (August 25, 2016)
* Fixed a bug that caused runtime to crash on invalid file path for formdata or binary files

#### 2.4.4 (August 25, 2016)
* Fixed a bug that caused incorrect host headers to be inserted in requests

#### 2.4.3 (August 23, 2016)
* Use `postman-request` instead of the `request` library, which contains fixes to support deflate encoding

#### 2.4.2 (August 18, 2016)
* Runtime now uses the length of iteration data as the default iteration count (if data is provided)
* Added functionality to bubble up the proxy configuration in the `request` event

#### 2.4.1 (August 12, 2016)
* Fixed a bug that caused the Runtime sandbox to fail when installed with npm@2
* Updated the proxy fetching logic to use URLs as a string instead of an SDK object

#### 2.4.0 (August 12, 2016)
* Changes to the Node script sandbox, SugarJS now works correctly.
* Ensure that `getResponseCookie` is case-insensitive always
* Check to ensure that Runtime does not crash if the path for file uploads is empty
* Ensured that the Accept header is always set (unless the user has overridden it)
* Headers that are added by Runtime are now always bubbled up
* Added support for specifying a delay between two iterations
* Requester now has the ability to fetch proxy configuration externally

#### 2.3.2 (August 05, 2016)
* Added support for resolving binary files on the fly

#### 2.3.1 (August 05, 2016)
* Added support for client side SSL authentication

#### 2.3.0 (August 04, 2016)
* Ability to insert delays between requests
* Ability to stop a run on any sort of failure (test case failure as well as errors)
* Updated the requester behavior to try IPv6 when the server is "localhost"
* Added a check to ensure that sandbox globals are filtered

#### 2.2.5 (July 30, 2016)
* Added support for exposing "responseCookies" array and "getResponseCookie" function in the sandbox
* Fixed file handling behavior, now the runner will ignore files (with a warning) if no fileResolver is provided

#### 2.2.4 (July 29, 2016)
* Fixed a bug that caused non-file form data to be ignored

#### 2.2.3 (July 29, 2016)
* Disabled file uploads if no fileResolver is provided
* Ensure that URL encoding is done in an XHR compatible way by the request library
* Allow aborting of individual HTTP requests
* Parse XHR headers using the Postman Collection SDK
* Updated the SDK version to v0.4.6

#### 2.2.2 (July 25, 2016)
* Updated the version of the request module

#### 2.2.1 (July 21, 2016)
* Allow setting of duplicate headers (same name, but different value)
* Do not send a request body if the body type is set, but it is empty

#### 2.2.0 (July 19, 2016)
* Fixed a bug which caused `done` to be called twice if it threw an error
* Added an option to abort a run on test failures (as well as errors)

#### 2.1.1 (July 13, 2016)
* Updated to postman-collection@0.4.1
* Fixed a bug that caused the Runtime to crash when used with stopOnError and with multiple iterations
* Added more test cases

#### 2.1.0 (July 12, 2016)
* Initial Release
