# Postman Runtime Changelog

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
