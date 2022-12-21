const errors = {
        invalidLookupStrategy: 'invalidLookupStrategy',
        invalidEntryPoints: 'invalidEntryPoints',
        invalidFolderOrRequest: 'invalidFolderOrRequest'
    },
    errorCodes = {
        genericError: -1,
        invalidLookupStrategy: 1,
        invalidEntryPoints: 2,
        invalidFolderOrRequest: 3
    };

module.exports = {
    errors,
    errorCodes
};
