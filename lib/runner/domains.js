const _ = require('lodash'),
    PostmanUrl = require('postman-collection').Url,
    PostmanUrlMatchPattern = require('postman-collection').UrlMatchPattern;

function getDomains (variable) {
    try {
        return variable._.domains;
    }
    catch (err) {
        return [];
    }
}

function generateKeyDomainMatchPatternsMap (vaultSecrets) {
    const keyDomainMatchPatternsMap = vaultSecrets.reduce((acc, secret) => {
        const domains = getDomains(secret),
            domainMatchPatterns = domains.map((domain) => {
                const parsedDomain = new PostmanUrl(domain),
                    domainProtocol = parsedDomain.protocol,
                    domainHost = parsedDomain.getHost(),
                    // 2. Convert the set to a URL match pattern with protocol prefix and trailing /
                    domainMatchPattern = new PostmanUrlMatchPattern(`${domainProtocol}://${domainHost}/`);

                return domainMatchPattern;
            });

        acc[secret.key] = domainMatchPatterns;

        return acc;
    }, {});

    return keyDomainMatchPatternsMap;
}

function getMatchingVariables (keyDomainMatchPatternsMap, urlString, vaultSecrets) {
    const parsedUrl = new PostmanUrl(urlString),
        urlProtocol = parsedUrl.protocol,
        urlHost = parsedUrl.getHost();

    let matchingVaultSecrets = _.cloneDeep(vaultSecrets.values);

    // 3. Traverse all the vault variables and for each variable check if the domain pattern is a match
    matchingVaultSecrets = vaultSecrets.filter((secret) => {
        const domainsMapForThisSecret = keyDomainMatchPatternsMap[secret.key];

        if (domainsMapForThisSecret.length === 0) {
            return true;
        }

        return keyDomainMatchPatternsMap[secret.key].some((domainMatchPattern) => {
            return domainMatchPattern.test(`${urlProtocol}://${urlHost}/`);
        });
    });

    return matchingVaultSecrets;
}

module.exports = {
    getDomains,
    generateKeyDomainMatchPatternsMap,
    getMatchingVariables
};
