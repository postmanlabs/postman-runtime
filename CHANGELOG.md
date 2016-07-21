# Postman Runtime Changelog

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
