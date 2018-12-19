var fs = require('fs'),
    http = require('http'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    enableServerDestroy = require('server-destroy');

describe('form-data with numeric keys', function () {
    var server,
        testrun;

    /**
     * Parse raw form-data content
     *
     * @param {String} raw
     * @returns {Array}
     *
     * Reference: https: //tools.ietf.org/html/rfc7578
     *
     * @example
     * --boundary
     * Content-Disposition: form-data; name="foo"
     * Content-Type: text/plain
     *
     * bar
     * --boundary
     *
     * returns -> [{name: 'foo', contentType: 'text/plain'}]
     */
    function parseRaw(raw) {
        raw = raw.split('\r\n');
        var boundary = raw[0],
            result = [],
            data,
            match,
            i,
            ii;

        for (i = 0, ii = raw.length; i < ii; i++) {
            if (raw[i] !== boundary) {
                continue;
            }

            data = {};
            match = (/\sname="(.*?)"/).exec(raw[++i]);
            match && (data.name = match[1]);

            match = (/^Content-Type:\s(.*)$/).exec(raw[++i]);
            match && (data.contentType = match[1]);

            Object.keys(data).length && result.push(data);
        }

        return result;
    }

    before(function (done) {
        server = http.createServer(function (req, res) {
            var rawBody = '';

            req.on('data', function (chunk) {
                rawBody += chunk.toString(); // decode buffer to string
            }).on('end', function () {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Connection': 'close'
                });
                res.end(JSON.stringify(parseRaw(rawBody)));
            });
        }).listen(5050, function () {
            this.run({
                fileResolver: fs,
                collection: {
                    item: [{
                        request: {
                            url: 'http://localhost:5050/',
                            method: 'POST',
                            body: {
                                mode: 'formdata',
                                formdata: [{
                                    key: 'a',
                                    src: 'test/fixtures/upload-csv',
                                    type: 'file'
                                }, {
                                    key: '1',
                                    value: 'second_value',
                                    type: 'text'
                                }, {
                                    key: 'A',
                                    value: 'third_value',
                                    type: 'text'
                                }, {
                                    key: '0',
                                    src: 'test/fixtures/upload-csv',
                                    type: 'file',
                                    contentType: 'text/csv'
                                }]
                            }
                        }
                    }]
                }
            }, function (err, results) {
                testrun = results;
                done(err);
            });
        }.bind(this));
        enableServerDestroy(server);
    });

    after(function (done) {
        server.destroy(done);
    });

    it('should complete the run', function () {
        expect(testrun).to.be.ok;
        sinon.assert.calledOnce(testrun.start);
        sinon.assert.calledOnce(testrun.done);
        sinon.assert.calledWith(testrun.done.getCall(0), null);

        sinon.assert.calledOnce(testrun.request);
        sinon.assert.calledWith(testrun.request.getCall(0), null);

        sinon.assert.calledOnce(testrun.response);
        sinon.assert.calledWith(testrun.response.getCall(0), null);
    });

    it('should respect the defined form-data fields order', function () {
        var response = testrun.request.getCall(0).args[2].stream.toString();

        expect(JSON.parse(response)).to.have.deep.ordered.members([{
            'name': 'a',
            'contentType': 'application/octet-stream'
        }, {
            'name': '1'
        }, {
            'name': 'A'
        }, {
            'name': '0',
            'contentType': 'text/csv'
        }]);
    });
});
