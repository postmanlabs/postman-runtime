# Postman Runtime Changelog

#### Unreleased
* [Breaking] Changed the runtime API to receive a VariableScope instead of plain object

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
