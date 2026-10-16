var fs = require('fs'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    IS_BROWSER = typeof window !== 'undefined',

    // fake ids (e.g. cloud files) mapped onto real fixture files
    FILES = {
        A: 'test/fixtures/upload-file.json',
        B: 'test/fixtures/upload-csv.json',
        C: 'test/fixtures/new.csv'
    },
    resolver = {
        stat (src, cb) { fs.stat(FILES[src] || 'nonexistent/' + src, cb); },
        createReadStream (src) { return fs.createReadStream(FILES[src]); }
    };

(IS_BROWSER ? describe.skip : describe)('file upload with multiple file params', function () {
    function runWith (formdata, callback) {
        this.run({
            fileResolver: resolver,
            collection: {
                item: [{
                    request: {
                        url: 'https://postman-echo.com/post',
                        method: 'POST',
                        body: { mode: 'formdata', formdata: formdata }
                    }
                }]
            }
        }, function (err, testrun) {
            if (err) {
                return callback(err);
            }
            sinon.assert.calledOnce(testrun.done);
            sinon.assert.calledWith(testrun.done.getCall(0), null);
            sinon.assert.calledOnce(testrun.request);

            callback(null, testrun, JSON.parse(testrun.response.getCall(0).args[2].stream.toString()));
        });
    }

    function file (key, src) { return { key: key, type: 'file', src: src }; }
    function warnings (testrun) {
        return testrun.console.args.map(function (a) { return a[2]; });
    }

    it('should send every param when each has a single-element array src', function (done) {
        runWith.call(this, [file('f1', ['A']), file('f2', ['B'])], function (err, testrun, resp) {
            expect(err).to.not.be.ok;
            expect(resp.files).to.have.all.keys('upload-file.json', 'upload-csv.json');
            done();
        });
    });

    it('should send all three params when each has an array src', function (done) {
        runWith.call(this, [file('f1', ['A']), file('f2', ['B']), file('f3', ['C'])],
            function (err, testrun, resp) {
                expect(err).to.not.be.ok;
                expect(Object.keys(resp.files)).to.have.members(['upload-file.json', 'upload-csv.json', 'new.csv']);
                done();
            });
    });

    it('should warn for an unresolved array src and still send later params', function (done) {
        runWith.call(this, [file('f1', ['missing']), file('f2', ['B'])], function (err, testrun, resp) {
            expect(err).to.not.be.ok;
            expect(warnings(testrun)).to.have.lengthOf(1);
            expect(warnings(testrun)[0]).to.match(/^Form param `f1`, file load error: /);
            expect(resp.files).to.have.all.keys('upload-csv.json');
            done();
        });
    });

    it('should handle a mix of string and array src', function (done) {
        runWith.call(this, [file('f1', 'A'), file('f2', ['B', 'C']), file('f3', 'C')],
            function (err, testrun, resp) {
                expect(err).to.not.be.ok;
                expect(Object.keys(resp.files)).to.have.members(['upload-file.json', 'upload-csv.json',
                    'new.csv']);
                done();
            });
    });

    it('should not drop later params after an array src followed by an empty array src', function (done) {
        runWith.call(this, [file('f1', ['B']), file('f2', []), file('f3', 'A')], function (err, testrun, resp) {
            expect(err).to.not.be.ok;
            expect(warnings(testrun)).to.eql(['Form param `f2`, file load error: missing file source']);
            expect(resp.files).to.include.keys('upload-csv.json', 'upload-file.json');
            done();
        });
    });
});
