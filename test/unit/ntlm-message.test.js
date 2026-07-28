var crypto = require('crypto'),
    expect = require('chai').expect,
    sinon = require('sinon'),

    ntlm = require('../../lib/authorizer/ntlm-message'),

    /**
     * The type 2 challenge used by the mock NTLM server in test/fixtures/servers/_servers.js, which
     * is also the one upstream's own unit tests use. Its negotiateFlags are
     * Unicode | RequestTarget | NTLM | AlwaysSign | ExtendedSecurity | TargetInfo | Version | 128 | 56,
     * and it carries a target info blob, so it drives the NTLMv2 path.
     */
    TYPE_2_MESSAGE = 'NTLM ' +
        'TlRMTVNTUAACAAAAHgAeADgAAAAFgoqiBevywvJykjAAAAAAAAAAAJgAmABWAAAA' +
        'CgC6RwAAAA9EAEUAUwBLAFQATwBQAC0ASgBTADQAVQBKAFQARAACAB4ARABFAFMA' +
        'SwBUAE8AUAAtAEoAUwA0AFUASgBUAEQAAQAeAEQARQBTAEsAVABPAFAALQBKAFMA' +
        'NABVAEoAVABEAAQAHgBEAEUAUwBLAFQATwBQAC0ASgBTADQAVQBKAFQARAADAB4A' +
        'RABFAFMASwBUAE8AUAAtAEoAUwA0AFUASgBUAEQABwAIADmguzCHn9UBAAAAAA==',

    // a fixed client challenge and clock, so the NTLMv2 responses are deterministic
    FIXED_CLIENT_CHALLENGE = Buffer.alloc(8, 0xcf),
    FIXED_NOW = 1679346960095,

    OPTIONS = {
        url: 'https://someurl.com',
        username: 'm$',
        password: 'stinks',
        workstation: 'choose.something',
        domain: ''
    },

    /**
     * Golden vectors. Every one of these was produced by `httpntlm@1.8.13`, the package this module
     * replaces — the first four and the next three are lifted verbatim from its own test suite
     * (node_modules/httpntlm/test/unit.js), and the last two were generated from it to cover paths
     * it does not publish a vector for. Upstream makes its output deterministic by stubbing
     * `Math.random` to 0.8092 and `Date.now` to 1679346960095; `Math.floor(0.8092 * 256)` is 0xcf,
     * which is why FIXED_CLIENT_CHALLENGE is a run of 0xcf bytes.
     *
     * These are the primary correctness gate for the port. The NTLM integration suite only compares
     * message *prefixes* (test/fixtures/servers/_servers.js:613 and :627), so it never checks any of
     * the cryptographic bytes.
     */
    VECTORS = {
        type1: 'NTLM TlRMTVNTUAABAAAAB7IIogoACgA4AAAAEAAQACgAAAAFASgKAAAAD0NIT09TRS5TT01FVEhJTkdTT01FRE9NQUlO',
        type1NoDomain: 'NTLM TlRMTVNTUAABAAAAB6IIogAAAAA4AAAAEAAQACgAAAAFASgKAAAAD0NIT09TRS5TT01FVEhJTkc=',
        type1NoWorkstation: 'NTLM TlRMTVNTUAABAAAAB6IIogAAAAAoAAAAAAAAACgAAAAFASgKAAAADw==',

        type3: 'NTLM TlRMTVNTUAADAAAAGAAYAGwAAADIAMgAhAAAAAAAAABIAAAABAAEAEgAAAAgACAATAAAAAAAAABMAQAABYKIogUBKAoAAA' +
            'APbQAkAEMASABPAE8AUwBFAC4AUwBPAE0ARQBUAEgASQBOAEcA34OQvQRxhMrl/ZdqHfdXsc/Pz8/Pz8/PBRktHt+/zDBHvSp4tqm' +
            'fpwEBAAAAAAAA8OZaK3Fb2QHPz8/Pz8/PzwAAAAACAB4ARABFAFMASwBUAE8AUAAtAEoAUwA0AFUASgBUAEQAAQAeAEQARQBTAEsA' +
            'VABPAFAALQBKAFMANABVAEoAVABEAAQAHgBEAEUAUwBLAFQATwBQAC0ASgBTADQAVQBKAFQARAADAB4ARABFAFMASwBUAE8AUAAtA' +
            'EoAUwA0AFUASgBUAEQABwAIADmguzCHn9UBAAAAAAAAAAA=',

        // negotiateFlags of zero: no Unicode (so ascii encodings) and no extended security (so NTLMv1)
        type3NtlmV1: 'NTLM TlRMTVNTUAADAAAAGAAYAFoAAAAYABgAcgAAAAAAAABIAAAAAgACAEgAAAAQABAASgAAAAAAAACKAAAABIKIogUB' +
            'KAoAAAAPbSRDSE9PU0UuU09NRVRISU5HEBenAMbG/BJagLAbC+ssxjoV6DmoMZnLPnIxjabRKh2kis6avHJoHUvdnSQrhLYz',

        type3EmptyOptions: 'NTLM TlRMTVNTUAADAAAAGAAYAEgAAADIAMgAYAAAAAAAAABIAAAAAAAAAEgAAAAAAAAASAAAAAAAAAAoAQAABYKI' +
            'ogUBKAoAAAAPwARIPPqPB18BtDy2SiF1us/Pz8/Pz8/P52yYCH+rc7F7jUeUnayiPQEBAAAAAAAA8OZaK3Fb2QHPz8/Pz8/PzwAAA' +
            'AACAB4ARABFAFMASwBUAE8AUAAtAEoAUwA0AFUASgBUAEQAAQAeAEQARQBTAEsAVABPAFAALQBKAFMANABVAEoAVABEAAQAHgBEAE' +
            'UAUwBLAFQATwBQAC0ASgBTADQAVQBKAFQARAADAB4ARABFAFMASwBUAE8AUAAtAEoAUwA0AFUASgBUAEQABwAIADmguzCHn9UBAAA' +
            'AAAAAAAA=',

        // extended security negotiated, but no target info, which is the only route to NTLM2 session security
        type3Ntlm2Session: 'NTLM TlRMTVNTUAADAAAAGAAYAGwAAAAYABgAhAAAAAAAAABIAAAABAAEAEgAAAAgACAATAAAAAAAAACcAAAABYKI' +
            'ogUBKAoAAAAPbQAkAEMASABPAE8AUwBFAC4AUwBPAE0ARQBUAEgASQBOAEcAz8/Pz8/Pz88AAAAAAAAAAAAAAAAAAAAAK49WpD9h3' +
            'WqhpVe+6oFLLDZWeV1/pTpR',

        // NTLMv1 with a password longer than the 14 bytes the LM hash allows for
        type3LongPassword: 'NTLM TlRMTVNTUAADAAAAGAAYAFoAAAAYABgAcgAAAAAAAABIAAAAAgACAEgAAAAQABAASgAAAAAAAACKAAAABIKI' +
            'ogUBKAoAAAAPbSRDSE9PU0UuU09NRVRISU5HsHMvTjluyuPuICE/vHFXV5SeAUazQl7u9srSL4gQonp04PReoJjVT1nPMed1k5XN'
    };

/**
 * Builds a type 2 message object, optionally overriding the negotiated flags or dropping the target
 * info blob, to reach the code paths the mock server's fixed challenge never exercises.
 *
 * @param {Object} [overrides] - Properties to merge over the parsed message
 * @param {Boolean} [dropTargetInfo] - Remove `targetInfo` from the result
 * @returns {Object}
 */
function challenge (overrides, dropTargetInfo) {
    var msg = { ...ntlm.parseType2Message(TYPE_2_MESSAGE, function () { /* noop */ }), ...overrides };

    if (dropTargetInfo) { delete msg.targetInfo; }

    return msg;
}

describe('ntlm message', function () {
    describe('createType1Message', function () {
        it('should build a negotiate message with a domain and a workstation', function () {
            expect(ntlm.createType1Message({ ...OPTIONS, domain: 'someDomain' }))
                .to.equal(VECTORS.type1);
        });

        it('should clear the OemDomainSupplied flag when there is no domain', function () {
            expect(ntlm.createType1Message({ ...OPTIONS })).to.equal(VECTORS.type1NoDomain);
        });

        it('should build a negotiate message with no workstation', function () {
            expect(ntlm.createType1Message({ ...OPTIONS, workstation: '' }))
                .to.equal(VECTORS.type1NoWorkstation);
        });

        it('should default a missing domain and workstation to empty strings', function () {
            expect(ntlm.createType1Message({})).to.equal(VECTORS.type1NoWorkstation);
        });
    });

    describe('parseType2Message', function () {
        it('should parse a challenge message', function () {
            var parsed = ntlm.parseType2Message(TYPE_2_MESSAGE, function () { /* noop */ });

            expect(parsed.type).to.equal(2);
            expect(parsed.signature.toString('hex')).to.equal('4e544c4d53535000');
            expect(parsed.negotiateFlags).to.equal(-1567981051);
            expect(parsed.serverChallenge.toString('hex')).to.equal('05ebf2c2f2729230');
            expect(parsed.reserved.toString('hex')).to.equal('0000000000000000');
            expect(parsed.targetNameLen).to.equal(30);
            expect(parsed.targetNameMaxLen).to.equal(30);
            expect(parsed.targetNameOffset).to.equal(56);
            expect(parsed.targetName.toString('utf16le')).to.equal('DESKTOP-JS4UJTD');
            expect(parsed.targetInfoLen).to.equal(152);
            expect(parsed.targetInfoMaxLen).to.equal(152);
            expect(parsed.targetInfoOffset).to.equal(86);
            expect(parsed.targetInfo).to.have.lengthOf(152);
        });

        it('should return null and report an error when the header has no NTLM payload', function () {
            var err;

            expect(ntlm.parseType2Message('Negotiate', function (error) { err = error; })).to.be.null;
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal('Couldn\'t find NTLM in the message type2 coming from the server');
        });

        it('should return null and report an error when the message is not type 2', function () {
            var err,
                type1 = ntlm.createType1Message({ domain: 'someDomain', workstation: 'choose.something' });

            expect(ntlm.parseType2Message(type1, function (error) { err = error; })).to.be.null;
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal('Server didn\'t return a type 2 message');
        });

        it('should omit target info when the NegotiateTargetInfo flag is not set', function () {
            // 0x00800000 is NTLM_NegotiateTargetInfo; clearing it should skip the target info fields
            var raw = Buffer.from(TYPE_2_MESSAGE.slice('NTLM '.length), 'base64'),
                parsed;

            raw.writeInt32LE(raw.readInt32LE(20) & ~0x00800000, 20);
            parsed = ntlm.parseType2Message('NTLM ' + raw.toString('base64'), function () { /* noop */ });

            expect(parsed.type).to.equal(2);
            expect(parsed.targetInfo).to.be.undefined;
            expect(parsed.targetInfoLen).to.be.undefined;
        });
    });

    describe('createType3Message', function () {
        beforeEach(function () {
            sinon.stub(crypto, 'randomBytes').returns(Buffer.from(FIXED_CLIENT_CHALLENGE));
            sinon.stub(Date, 'now').returns(FIXED_NOW);
        });

        afterEach(function () {
            sinon.restore();
        });

        it('should build an NTLMv2 authenticate message', function () {
            expect(ntlm.createType3Message(challenge(), { ...OPTIONS })).to.equal(VECTORS.type3);
        });

        it('should fall back to NTLMv1 and ascii encoding when nothing is negotiated', function () {
            expect(ntlm.createType3Message(challenge({ negotiateFlags: 0 }), { ...OPTIONS }))
                .to.equal(VECTORS.type3NtlmV1);
        });

        it('should default missing credentials to empty strings', function () {
            expect(ntlm.createType3Message(challenge(), {})).to.equal(VECTORS.type3EmptyOptions);
        });

        it('should use NTLM2 session security when extended security is negotiated without target info',
            function () {
                expect(ntlm.createType3Message(challenge(undefined, true), { ...OPTIONS }))
                    .to.equal(VECTORS.type3Ntlm2Session);
            });

        it('should truncate a password longer than 14 bytes for the LM hash', function () {
            expect(ntlm.createType3Message(challenge({ negotiateFlags: 0 }),
                { ...OPTIONS, password: 'Azx123456Azx123456' }))
                .to.equal(VECTORS.type3LongPassword);
        });

        it('should draw the client challenge from a cryptographic source', function () {
            ntlm.createType3Message(challenge(), { ...OPTIONS });

            expect(crypto.randomBytes.calledOnceWithExactly(8)).to.be.true;
        });
    });
});

/**
 * `httpntlm` is retained as a devDependency purely so this suite can diff against it. Skipped in the
 * browser: the bundle would pull `underscore` (the very package this change removes) back into the
 * test bundle, and upstream's `Buffer#writeBigUInt64LE` does not exist in browserify's buffer shim.
 */
(typeof window === 'undefined' ? describe : describe.skip)('ntlm message vs httpntlm', function () {
    // eslint-disable-next-line n/no-unpublished-require
    var upstream = require('httpntlm').ntlm,
        realMathRandom = Math.random,

        FLAG_SETS = [
            { name: 'unicode + extended security + target info', negotiateFlags: -1567981051 },
            { name: 'nothing negotiated', negotiateFlags: 0 },
            { name: 'unicode only', negotiateFlags: 0x00000001 },
            { name: 'extended security only', negotiateFlags: 0x00080000 }
        ],

        OPTION_SETS = [
            OPTIONS,
            { username: 'someUsername', password: 'Azx123456', workstation: 'WS', domain: 'someDomain' },
            { username: 'u', password: 'Azx123456Azx123456', workstation: '', domain: 'D' },
            { username: '', password: '', workstation: '', domain: '' },
            {}
        ];

    beforeEach(function () {
        sinon.stub(crypto, 'randomBytes').returns(Buffer.from(FIXED_CLIENT_CHALLENGE));
        sinon.stub(Date, 'now').returns(FIXED_NOW);

        // upstream derives its client challenge from the global Math.random
        Math.random = function () { return 0.8092; };
    });

    afterEach(function () {
        sinon.restore();
        Math.random = realMathRandom;
    });

    it('should parse challenge messages identically', function () {
        expect(ntlm.parseType2Message(TYPE_2_MESSAGE, function () { /* noop */ }))
            .to.eql(upstream.parseType2Message(TYPE_2_MESSAGE, function () { /* noop */ }));
    });

    OPTION_SETS.forEach(function (options, index) {
        it(`should build identical negotiate messages for option set ${index}`, function () {
            expect(ntlm.createType1Message({ ...options }))
                .to.equal(upstream.createType1Message({ ...options }));
        });
    });

    FLAG_SETS.forEach(function (flagSet) {
        [false, true].forEach(function (dropTargetInfo) {
            OPTION_SETS.forEach(function (options, index) {
                var suffix = dropTargetInfo ? ', no target info' : '';

                it(`should build identical authenticate messages for ${flagSet.name}${suffix}, ` +
                    `option set ${index}`, function () {
                    var msg2 = challenge({ negotiateFlags: flagSet.negotiateFlags }, dropTargetInfo);

                    expect(ntlm.createType3Message({ ...msg2 }, { ...options }))
                        .to.equal(upstream.createType3Message({ ...msg2 }, { ...options }));
                });
            });
        });
    });

    it('should encode the FILETIME timestamp identically across a range of clock values', function () {
        var msg2 = challenge(),
            options = { ...OPTIONS },
            timestamps = [0, 1, 1679346960095, 2147483647999, 4102444800000],
            i;

        // upstream uses BigInt arithmetic here; the vendored copy splits the multiply across two
        // 32-bit words to stay usable under browserify's buffer shim
        for (i = 0; i < timestamps.length; i++) {
            Date.now.returns(timestamps[i]);

            expect(ntlm.createType3Message({ ...msg2 }, { ...options }))
                .to.equal(upstream.createType3Message({ ...msg2 }, { ...options }));
        }
    });
});
