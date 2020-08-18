var fs = require('fs'),
    sinon = require('sinon'),
    expect = require('chai').expect;

(typeof window === 'undefined' ? describe : describe.skip)('form-data with numeric keys', function () {
    var testrun;

    before(function (done) {
        this.run({
            fileResolver: fs,
            collection: {
                item: [{
                    request: {
                        url: global.servers.rawContentType,
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
