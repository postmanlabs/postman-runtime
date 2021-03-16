const {expect} = require('chai');


describe('Entrypoint attribute preserveOrder', function () {
    var testrun;

    before(function (done) {
        this.run({
            collection: 'test/fixtures/Sample.postman_collection.json',
            entrypoint: {
                execute: ['R3', 'R1'],
                preserveOrder: true,
                lookupStrategy: 'multipleIdOrName'
            }
        }, function (err, results) {
            testrun = results;
            done(err);
        });
    });
    // eslint-disable-next-line mocha/valid-test-description
    it('works correctly,when set.', function () {
        expect(testrun).to.be.ok;
    });
});
