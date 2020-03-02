var expect = require('chai').expect,
    server = require('../../fixtures/server'),
    encoder = require('postman-url-encoder/encoder');

describe('URL encoding', function () {
    var echoServer = server.createRawEchoServer();

    before(function (done) {
        echoServer.listen(done);
    });

    after(function (done) {
        echoServer.destroy(done);
    });

    describe('path', function () {
        it('should percent-encode C0 control codes', function (done) {
            var i,
                pathToSend = [],
                expectedPath = [];

            for (i = 0; i < 32; i++) {
                pathToSend.push(String.fromCharCode(i));
                expectedPath.push(encoder.percentEncodeCharCode(i));
            }

            pathToSend.push(String.fromCharCode(127));
            expectedPath.push(encoder.percentEncodeCharCode(127));

            this.run({
                requester: {
                    useWhatWGUrlParser: true
                },
                collection: {
                    item: {
                        request: `${echoServer.url}/start/${pathToSend.join('/')}/end`
                    }
                }
            }, function (err, result) {
                expect(err).to.not.be.ok;
                expect(result.response.calledOnce).to.be.ok;

                var response = result.response.getCall(0).args[2].stream.toString(),

                    // extract sent path from response
                    // response = <something>/start/<sentPath>/end<something>
                    sentPath = response.slice(response.indexOf('/start/') + 7, response.indexOf('/end')).split('/');

                expect(sentPath).to.eql(expectedPath);
                done();
            });
        });

        it('should percent-encode SPACE, ("), (<), (>), (`), (#), (?), ({), and (})', function (done) {
            var i,
                char,
                pathToSend = [],
                expectedPath = [],
                encodeSet = new Set([' ', '"', '<', '>', '`', '#', '?', '{', '}']),
                reservedPathChars = new Set(['#', '?', '/', '\\']);

            for (i = 32; i < 127; i++) {
                char = String.fromCharCode(i);

                // don't add characters that can mess up parsing of path
                if (reservedPathChars.has(char)) { continue; }

                pathToSend.push(char);
                expectedPath.push(encodeSet.has(char) ? encoder.percentEncodeCharCode(i) : char);
            }

            this.run({
                requester: {
                    useWhatWGUrlParser: true
                },
                collection: {
                    item: {
                        request: `${echoServer.url}/start/${pathToSend.join('/')}/end`
                    }
                }
            }, function (err, result) {
                expect(err).to.not.be.ok;
                expect(result.response.calledOnce).to.be.ok;

                var response = result.response.getCall(0).args[2].stream.toString(),

                    // extract sent path from response
                    // response = <something>/start/<sentPath>/end<something>
                    sentPath = response.slice(response.indexOf('/start/') + 7, response.indexOf('/end')).split('/');

                expect(sentPath).to.eql(expectedPath);
                done();
            });
        });
    });

    describe('query', function () {
        it('should percent-encode C0 control codes', function (done) {
            var i,
                valueToSend = [],
                expectedValue = [];

            for (i = 0; i < 32; i++) {
                valueToSend.push(String.fromCharCode(i));
                expectedValue.push(encoder.percentEncodeCharCode(i));
            }

            valueToSend.push(String.fromCharCode(127));
            expectedValue.push(encoder.percentEncodeCharCode(127));

            this.run({
                requester: {
                    useWhatWGUrlParser: true
                },
                collection: {
                    item: {
                        request: `${echoServer.url}/start?q1=${valueToSend.join('/')}/end`
                    }
                }
            }, function (err, result) {
                expect(err).to.not.be.ok;
                expect(result.response.calledOnce).to.be.ok;

                var response = result.response.getCall(0).args[2].stream.toString(),

                    // extract sentValue from response
                    // response = <something>/start?q1=<sentValue>/end<something>
                    sentValue = response.slice(response.indexOf('/start?q1=') + 10, response.indexOf('/end'));

                sentValue = sentValue.split('/');

                expect(sentValue).to.eql(expectedValue);
                done();
            });
        });

        it('should percent-encode SPACE, ("), (#), (&), (\'), (<), (=), and (>)', function (done) {
            var i,
                char,
                valueToSend = [],
                expectedValue = [],
                encodeSet = new Set([' ', '"', '#', '&', '\'', '<', '=', '>']),
                reservedPathChars = new Set(['#', '&']);

            for (i = 32; i < 127; i++) {
                char = String.fromCharCode(i);

                // don't add characters that can mess up parsing of query
                if (reservedPathChars.has(char)) { continue; }

                valueToSend.push(char);
                expectedValue.push(encodeSet.has(char) ? encoder.percentEncodeCharCode(i) : char);
            }

            this.run({
                requester: {
                    useWhatWGUrlParser: true
                },
                collection: {
                    item: {
                        request: {
                            url: `${echoServer.url}/start?q1=${valueToSend.join('\n')}/end`
                        }
                    }
                }
            }, function (err, result) {
                expect(err).to.not.be.ok;
                expect(result.response.calledOnce).to.be.ok;

                var response = result.response.getCall(0).args[2].stream.toString(),

                    // extract sent path from response
                    // response = <something>/start/<sentPath>/end<something>
                    sentValue = response.slice(response.indexOf('/start?q1=') + 10, response.indexOf('/end'));

                // split by '%0A' because original '\n' will be encoded to '%0A'
                sentValue = sentValue.split('%0A');

                expect(sentValue).to.eql(expectedValue);
                done();
            });
        });
    });
});
