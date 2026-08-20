var expect = require('chai').expect,
    runtime = require('../..');

describe('runtime features', function () {
    it('should explicitly advertise native script report support', function () {
        expect(runtime.features).to.deep.equal({ performanceTestOutputReportV1: true });
        expect(Object.isFrozen(runtime.features)).to.be.true;
    });
});
