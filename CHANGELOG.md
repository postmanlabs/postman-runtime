# Postman Runtime Changelog

#### 4.0.3 (January 31, 2017)
* Updated postman-collection to v0.5.11 which contains bugfixes for UTF-8 responses, and variables in URL host
* Updated postman-request which contains a bugfix for URL parameter encoding

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
