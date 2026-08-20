module.exports = {
    Runner: require('./runner'),
    Requester: require('./requester').Requester,
    version: require('./version'),
    features: Object.freeze({ performanceTestOutputReportV1: true })
};
