/**
 * Checks if the given url/domain string starts with a protocol
 *
 * @param {string} urlString url
 * @returns {true} if it contains a protocol, false otherwise
 */
function _containsProtocol (urlString) {
    if (urlString.includes('://')) {
        return true;
    }

    return false;
}

function areDomainsEqual (domainStringA, domainStringB) {
    try {
        let parsedDomainStringA = domainStringA,
            parsedDomainStringB = domainStringB,
            domainA,
            domainB;

        if (!_containsProtocol(parsedDomainStringA)) {
            parsedDomainStringA = `https://${parsedDomainStringA}`;
        }

        if (!_containsProtocol(parsedDomainStringB)) {
            parsedDomainStringB = `https://${parsedDomainStringB}`;
        }

        const urlA = new URL(parsedDomainStringA),
            urlB = new URL(parsedDomainStringB);

        domainA = urlA.host;
        domainB = urlB.host;

        if (urlA.protocol !== urlB.protocol) {
            return false;
        }

        if (!urlA.host.startsWith('www')) {
            domainA = `www.${domainA}`;
        }

        if (!urlB.host.startsWith('www')) {
            domainB = `www.${domainB}`;
        }

        if (domainA !== domainB) {
            return false;
        }

        return true;
    }
    catch (err) {
        return false;
    }
}

function getDomains (variable) {
    try {
        return variable._.domains;
    }
    catch (err) {
        return [];
    }
}

function hasDomain (variable) {
    const domains = getDomains(variable);

    if (!domains) {
        return false;
    }

    if (domains === '') {
        return false;
    }

    if (!Array.isArray(domains)) {
        return false;
    }

    if (Array.isArray(domains) && domains.length === 0) {
        return false;
    }

    return true;
}

function hasMatchingDomain (url) {
    return (variable) => {
        if (!hasDomain(variable)) {
            return true;
        }
        const domains = getDomains(variable);

        return domains.some((domain) => {
            return areDomainsEqual(url, domain);
        });
    };
}

module.exports = {
    _containsProtocol,
    areDomainsEqual,
    hasDomain,
    hasMatchingDomain
};
