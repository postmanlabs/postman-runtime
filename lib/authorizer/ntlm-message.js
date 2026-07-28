/**
 * @fileOverview
 *
 * Builds and parses the NTLM negotiate (type 1), challenge (type 2) and authenticate (type 3)
 * messages described by [MS-NLMP]: https://msdn.microsoft.com/en-us/library/cc236621.aspx
 *
 * Vendored from https://github.com/SamDecrock/node-http-ntlm/blob/v1.8.13/ntlm.js and restyled to
 * this repository's lint rules. `httpntlm` pins `underscore: ~1.12.1`, which can never resolve to
 * the version that fixes GHSA-qpx9-hpmf-5gmw, and 1.8.13 is its latest release. Only `ntlm.js`
 * was ever used here, and it does not depend on `underscore` at all — so vendoring this one file
 * drops both `underscore` and `httpreq` from the dependency tree.
 *
 * Deliberate differences from upstream, all covered by test/unit/ntlm-message.test.js:
 *   1. The NTLMv2 client challenge uses `crypto.randomBytes` instead of `Math.random`.
 *   2. The FILETIME timestamp avoids `BigInt` / `Buffer.prototype.writeBigUInt64LE` (see
 *      `writeFileTime`).
 *   3. Only the three functions this package consumes are exported, and the unused
 *      `options.lm_password` / `options.nt_password` overrides are dropped.
 *
 * Copyright (c) 2013 Sam Decrock https://github.com/SamDecrock/
 * All rights reserved.
 */

var crypto = require('crypto'),
    jsmd4 = require('js-md4'),
    desjs = require('des.js'),

    PROTOCOL = 'NTLMSSP\0',

    // page 57 in [MS-NLMP]
    MAGIC_KEY = Buffer.from('KGS!@#$%', 'ascii'),

    HEX2BINARY = {
        0: [0, 0, 0, 0],
        1: [0, 0, 0, 1],
        2: [0, 0, 1, 0],
        3: [0, 0, 1, 1],
        4: [0, 1, 0, 0],
        5: [0, 1, 0, 1],
        6: [0, 1, 1, 0],
        7: [0, 1, 1, 1],
        8: [1, 0, 0, 0],
        9: [1, 0, 0, 1],
        A: [1, 0, 1, 0],
        B: [1, 0, 1, 1],
        C: [1, 1, 0, 0],
        D: [1, 1, 0, 1],
        E: [1, 1, 1, 0],
        F: [1, 1, 1, 1]
    },

    BINARY2HEX = {
        '0000': 0,
        '0001': 1,
        '0010': 2,
        '0011': 3,
        '0100': 4,
        '0101': 5,
        '0110': 6,
        '0111': 7,
        1000: 8,
        1001: 9,
        1010: 'A',
        1011: 'B',
        1100: 'C',
        1101: 'D',
        1110: 'E',
        1111: 'F'
    },

    flags = {
        NTLM_NegotiateUnicode: 0x00000001,
        NTLM_NegotiateOEM: 0x00000002,
        NTLM_RequestTarget: 0x00000004,
        NTLM_Unknown9: 0x00000008,
        NTLM_NegotiateSign: 0x00000010,
        NTLM_NegotiateSeal: 0x00000020,
        NTLM_NegotiateDatagram: 0x00000040,
        NTLM_NegotiateLanManagerKey: 0x00000080,
        NTLM_Unknown8: 0x00000100,
        NTLM_NegotiateNTLM: 0x00000200,
        NTLM_NegotiateNTOnly: 0x00000400,
        NTLM_Anonymous: 0x00000800,
        NTLM_NegotiateOemDomainSupplied: 0x00001000,
        NTLM_NegotiateOemWorkstationSupplied: 0x00002000,
        NTLM_Unknown6: 0x00004000,
        NTLM_NegotiateAlwaysSign: 0x00008000,
        NTLM_TargetTypeDomain: 0x00010000,
        NTLM_TargetTypeServer: 0x00020000,
        NTLM_TargetTypeShare: 0x00040000,
        NTLM_NegotiateExtendedSecurity: 0x00080000,
        NTLM_NegotiateIdentify: 0x00100000,
        NTLM_Unknown5: 0x00200000,
        NTLM_RequestNonNTSessionKey: 0x00400000,
        NTLM_NegotiateTargetInfo: 0x00800000,
        NTLM_Unknown4: 0x01000000,
        NTLM_NegotiateVersion: 0x02000000,
        NTLM_Unknown3: 0x04000000,
        NTLM_Unknown2: 0x08000000,
        NTLM_Unknown1: 0x10000000,
        NTLM_Negotiate128: 0x20000000,
        NTLM_NegotiateKeyExchange: 0x40000000,
        NTLM_Negotiate56: 0x80000000
    },

    /**
     * @note these are summed rather than OR-ed, and flags are cleared by subtraction rather than
     * by `& ~`, because both totals exceed 2^31. JavaScript's bitwise operators coerce to int32,
     * which would make these negative and cause `Buffer#writeUInt32LE` to throw ERR_OUT_OF_RANGE.
     */
    typeflags = {
        NTLM_TYPE1_FLAGS: flags.NTLM_NegotiateUnicode +
            flags.NTLM_NegotiateOEM +
            flags.NTLM_RequestTarget +
            flags.NTLM_NegotiateNTLM +
            flags.NTLM_NegotiateOemDomainSupplied +
            flags.NTLM_NegotiateOemWorkstationSupplied +
            flags.NTLM_NegotiateAlwaysSign +
            flags.NTLM_NegotiateExtendedSecurity +
            flags.NTLM_NegotiateVersion +
            flags.NTLM_Negotiate128 +
            flags.NTLM_Negotiate56,

        NTLM_TYPE2_FLAGS: flags.NTLM_NegotiateUnicode +
            flags.NTLM_RequestTarget +
            flags.NTLM_NegotiateNTLM +
            flags.NTLM_NegotiateAlwaysSign +
            flags.NTLM_NegotiateExtendedSecurity +
            flags.NTLM_NegotiateTargetInfo +
            flags.NTLM_NegotiateVersion +
            flags.NTLM_Negotiate128 +
            flags.NTLM_Negotiate56
    };

/**
 * Expands a buffer into an array of bits, most significant first.
 *
 * @private
 * @param {Buffer} buf - Bytes to expand
 * @returns {Number[]} One element per bit, each 0 or 1
 */
function bytes2binaryArray (buf) {
    var hexString = buf.toString('hex').toUpperCase(),
        array = [];

    for (let i = 0; i < hexString.length; i++) {
        array = array.concat(HEX2BINARY[hexString.charAt(i)]);
    }

    return array;
}

/**
 * Packs an array of bits back into a buffer. The input length is always a multiple of 8 here.
 *
 * @private
 * @param {Number[]} array - One element per bit, each 0 or 1
 * @returns {Buffer}
 */
function binaryArray2bytes (array) {
    var bufArray = [],
        binString1,
        binString2;

    for (let i = 0; i < array.length; i += 8) {
        binString1 = `${array[i]}${array[i + 1]}${array[i + 2]}${array[i + 3]}`;
        binString2 = `${array[i + 4]}${array[i + 5]}${array[i + 6]}${array[i + 7]}`;

        bufArray.push(Buffer.from(`${BINARY2HEX[binString1]}${BINARY2HEX[binString2]}`, 'hex'));
    }

    return Buffer.concat(bufArray);
}

/**
 * Turns a 7-byte block into the 8-byte parity-padded form DES expects as a key.
 *
 * @private
 * @param {Buffer} buf - 7 bytes
 * @returns {Buffer} 8 bytes
 */
function insertZerosEvery7Bits (buf) {
    var binaryArray = bytes2binaryArray(buf),
        newBinaryArray = [];

    for (let i = 0; i < binaryArray.length; i++) {
        newBinaryArray.push(binaryArray[i]);

        if ((i + 1) % 7 === 0) {
            newBinaryArray.push(0);
        }
    }

    return binaryArray2bytes(newBinaryArray);
}

/**
 * DES-encrypts the [MS-NLMP] magic constant using the given 7-byte block as the key.
 *
 * @private
 * @param {Buffer} buf - 7 bytes of key material
 * @returns {Buffer} 8 bytes of ciphertext
 */
function desEncryptMagicKey (buf) {
    var des = desjs.DES.create({ type: 'encrypt', key: insertZerosEvery7Bits(buf) });

    return Buffer.from(des.update(MAGIC_KEY));
}

/**
 * Computes the LM hash (LMOWFv1) of a password.
 *
 * @private
 * @param {String} password - Plaintext password
 * @returns {Buffer} 16 bytes
 */
function create_LM_hashed_password_v1 (password) {
    // fix the password length to 14 bytes
    var passwordBytes = Buffer.from(password.toUpperCase(), 'ascii'),
        passwordBytesPadded = Buffer.alloc(14),
        sourceEnd = 14;

    if (passwordBytes.length < 14) { sourceEnd = passwordBytes.length; }
    passwordBytes.copy(passwordBytesPadded, 0, 0, sourceEnd);

    // split into 2 parts of 7 bytes:
    return Buffer.concat([
        desEncryptMagicKey(passwordBytesPadded.subarray(0, 7)),
        desEncryptMagicKey(passwordBytesPadded.subarray(7))
    ]);
}

/**
 * Computes the NT hash (NTOWFv1) of a password.
 *
 * @private
 * @param {String} password - Plaintext password
 * @returns {Buffer} 16 bytes
 */
function create_NT_hashed_password_v1 (password) {
    var md4 = jsmd4.create();

    md4.update(Buffer.from(password, 'utf16le'));

    return Buffer.from(md4.digest());
}

/**
 * Computes an NTLMv1 challenge response by DES-encrypting the server challenge under each of the
 * three 7-byte slices of the zero-padded password hash.
 *
 * @private
 * @param {Buffer} password_hash - LM or NT hash
 * @param {Buffer} server_challenge - 8-byte challenge from the type 2 message
 * @returns {Buffer} 24 bytes
 */
function calc_resp (password_hash, server_challenge) {
    // padding with zeros to make the hash 21 bytes long
    var passHashPadded = Buffer.alloc(21),
        resArray = [],
        des;

    password_hash.copy(passHashPadded, 0, 0, password_hash.length);

    des = desjs.DES.create({ type: 'encrypt', key: insertZerosEvery7Bits(passHashPadded.subarray(0, 7)) });
    resArray.push(Buffer.from(des.update(server_challenge.subarray(0, 8))));

    des = desjs.DES.create({ type: 'encrypt', key: insertZerosEvery7Bits(passHashPadded.subarray(7, 14)) });
    resArray.push(Buffer.from(des.update(server_challenge.subarray(0, 8))));

    des = desjs.DES.create({ type: 'encrypt', key: insertZerosEvery7Bits(passHashPadded.subarray(14, 21)) });
    resArray.push(Buffer.from(des.update(server_challenge.subarray(0, 8))));

    return Buffer.concat(resArray);
}

/**
 * @private
 * @param {Buffer} key - HMAC key
 * @param {Buffer} data - Message to sign
 * @returns {Buffer} 16 bytes
 */
function hmac_md5 (key, data) {
    var hmac = crypto.createHmac('md5', key);

    hmac.update(data);

    return hmac.digest();
}

/**
 * Computes the NTLMv1-with-extended-security (NTLM2 session response) challenge responses. Used
 * when the server negotiates extended security but sends no target info.
 *
 * @private
 * @param {Buffer} responseKeyNT - NT hash
 * @param {Buffer} serverChallenge - 8 bytes
 * @param {Buffer} clientChallenge - 8 bytes
 * @returns {Object} `lmChallengeResponse` and `ntChallengeResponse` buffers
 */
function ntlm2sr_calc_resp (responseKeyNT, serverChallenge, clientChallenge) {
    // padding with zeros to make the hash 16 bytes longer
    var lmChallengeResponse = Buffer.alloc(clientChallenge.length + 16),
        md5 = crypto.createHash('md5'),
        ntChallengeResponse,
        sess;

    clientChallenge.copy(lmChallengeResponse, 0, 0, clientChallenge.length);

    md5.update(Buffer.concat([serverChallenge, clientChallenge]));
    sess = md5.digest();
    ntChallengeResponse = calc_resp(responseKeyNT, sess.subarray(0, 8));

    return {
        lmChallengeResponse,
        ntChallengeResponse
    };
}

/**
 * @private
 * @param {Buffer} pwhash - NT hash
 * @param {String} user - Username
 * @param {String} domain - Domain name
 * @returns {Buffer} 16 bytes
 */
function NTOWFv2 (pwhash, user, domain) {
    return hmac_md5(pwhash, Buffer.from(user.toUpperCase() + domain, 'utf16le'));
}

/**
 * Encodes a Unix timestamp as a little-endian FILETIME: 100-nanosecond intervals since 1601-01-01.
 *
 * @note Upstream uses `BigInt` plus `Buffer#writeBigUInt64LE`. Neither is available here: `BigInt`
 * is outside this repo's configured lint environment, and browserify resolves `buffer` to 5.2.1,
 * which has no `writeBigUInt64LE` — so the browser bundle's type 3 path throws today. Splitting the
 * multiplication across two 32-bit words keeps every intermediate under 2^53 and is byte-identical
 * to the BigInt arithmetic.
 *
 * @private
 * @param {Number} now - Milliseconds since the Unix epoch
 * @returns {Buffer} 8 bytes, little-endian
 */
function writeFileTime (now) {
    // 11644473600000 = diff between 1970 and 1601
    var intervals = now + 11644473600000,
        lowProduct = (intervals % 4294967296) * 10000,
        buf = Buffer.alloc(8);

    buf.writeUInt32LE(lowProduct % 4294967296, 0);
    buf.writeUInt32LE((Math.floor(intervals / 4294967296) * 10000 +
        Math.floor(lowProduct / 4294967296)) % 4294967296, 4);

    return buf;
}

/**
 * Computes the NTLMv2 challenge responses.
 *
 * @private
 * @param {Buffer} pwhash - NT hash
 * @param {String} username - Username
 * @param {String} domain - Domain name
 * @param {Buffer} targetInfo - Target info blob from the type 2 message
 * @param {Buffer} serverChallenge - 8 bytes
 * @param {Buffer} clientChallenge - 8 bytes
 * @returns {Object} `lmChallengeResponse` and `ntChallengeResponse` buffers
 */
function calc_ntlmv2_resp (pwhash, username, domain, targetInfo, serverChallenge, clientChallenge) {
    var responseKeyNTLM = NTOWFv2(pwhash, username, domain),
        zero32Bit = Buffer.alloc(4, 0),

        lmV2ChallengeResponse = Buffer.concat([
            hmac_md5(responseKeyNTLM, Buffer.concat([serverChallenge, clientChallenge])),
            clientChallenge
        ]),

        temp = Buffer.concat([
            // Version
            Buffer.from([0x01, 0x01, 0x00, 0x00]),
            zero32Bit,
            writeFileTime(Date.now()),
            clientChallenge,
            zero32Bit,
            targetInfo,
            zero32Bit
        ]),

        proofString = hmac_md5(responseKeyNTLM, Buffer.concat([serverChallenge, temp]));

    return {
        lmChallengeResponse: lmV2ChallengeResponse,
        ntChallengeResponse: Buffer.concat([proofString, temp])
    };
}

/**
 * Creates an NTLM negotiate (type 1) message.
 *
 * @param {Object} options -
 * @param {String} [options.domain] - Domain name
 * @param {String} [options.workstation] - Workstation name
 * @returns {String} The value for an `Authorization` header
 */
function createType1Message (options) {
    var BODY_LENGTH = 40,
        domain,
        workstation,
        type1flags,
        pos = 0,
        buf;

    if (!options.domain) { options.domain = ''; }
    if (!options.workstation) { options.workstation = ''; }

    // `escape` guarantees String#length equals the ascii byte length below, which is what keeps the
    // buffer size and the offsets written into it consistent for non-ascii input
    domain = escape(options.domain.toUpperCase());
    workstation = escape(options.workstation.toUpperCase());

    type1flags = typeflags.NTLM_TYPE1_FLAGS;

    if (!domain || domain === '') {
        type1flags -= flags.NTLM_NegotiateOemDomainSupplied;
    }

    buf = Buffer.alloc(BODY_LENGTH + domain.length + workstation.length);

    buf.write(PROTOCOL, pos, PROTOCOL.length); pos += PROTOCOL.length; // protocol
    buf.writeUInt32LE(1, pos); pos += 4; // type 1
    buf.writeUInt32LE(type1flags, pos); pos += 4; // TYPE1 flag

    buf.writeUInt16LE(domain.length, pos); pos += 2; // domain length
    buf.writeUInt16LE(domain.length, pos); pos += 2; // domain max length
    buf.writeUInt32LE(BODY_LENGTH + workstation.length, pos); pos += 4; // domain buffer offset

    buf.writeUInt16LE(workstation.length, pos); pos += 2; // workstation length
    buf.writeUInt16LE(workstation.length, pos); pos += 2; // workstation max length
    buf.writeUInt32LE(BODY_LENGTH, pos); pos += 4; // workstation buffer offset

    buf.writeUInt8(5, pos); pos += 1; // ProductMajorVersion
    buf.writeUInt8(1, pos); pos += 1; // ProductMinorVersion
    buf.writeUInt16LE(2600, pos); pos += 2; // ProductBuild

    buf.writeUInt8(0, pos); pos += 1; // VersionReserved1
    buf.writeUInt8(0, pos); pos += 1; // VersionReserved2
    buf.writeUInt8(0, pos); pos += 1; // VersionReserved3
    buf.writeUInt8(15, pos); pos += 1; // NTLMRevisionCurrent

    // @note the length checks fix upstream issues #46 and possibly #57. The `pos` advance must stay
    // outside the guard — it is a no-op when the length is zero, and moving it inside would leave
    // the domain string overwriting the workstation string.
    if (workstation.length !== 0) {
        buf.write(workstation, pos, workstation.length, 'ascii'); // workstation string
    }
    pos += workstation.length;

    if (domain.length !== 0) {
        buf.write(domain, pos, domain.length, 'ascii'); // domain string
    }
    pos += domain.length;

    return 'NTLM ' + buf.toString('base64');
}

/**
 * Parses an NTLM challenge (type 2) message.
 *
 * @param {String} rawmsg - The raw `WWW-Authenticate` header value
 * @param {Function} callback - Invoked with an `Error` when the message cannot be parsed
 * @returns {Object|null} The parsed message, or `null` on failure
 */
function parseType2Message (rawmsg, callback) {
    var match = rawmsg.match(/NTLM (.+)/),
        msg = {},
        buf;

    if (!match) {
        callback(new Error('Couldn\'t find NTLM in the message type2 coming from the server'));

        return null;
    }

    buf = Buffer.from(match[1], 'base64');

    msg.signature = buf.subarray(0, 8);
    msg.type = buf.readInt16LE(8);

    if (msg.type !== 2) {
        callback(new Error('Server didn\'t return a type 2 message'));

        return null;
    }

    msg.targetNameLen = buf.readInt16LE(12);
    msg.targetNameMaxLen = buf.readInt16LE(14);
    msg.targetNameOffset = buf.readInt32LE(16);
    msg.targetName = buf.subarray(msg.targetNameOffset, msg.targetNameOffset + msg.targetNameMaxLen);

    // @note read as signed, matching upstream. The flag masks below work regardless, and callers
    // (including the mock server fixtures) observe this value.
    msg.negotiateFlags = buf.readInt32LE(20);
    msg.serverChallenge = buf.subarray(24, 32);
    msg.reserved = buf.subarray(32, 40);

    if (msg.negotiateFlags & flags.NTLM_NegotiateTargetInfo) {
        msg.targetInfoLen = buf.readInt16LE(40);
        msg.targetInfoMaxLen = buf.readInt16LE(42);
        msg.targetInfoOffset = buf.readInt32LE(44);
        msg.targetInfo = buf.subarray(msg.targetInfoOffset, msg.targetInfoOffset + msg.targetInfoLen);
    }

    return msg;
}

/**
 * Creates an NTLM authenticate (type 3) message in response to a challenge.
 *
 * @param {Object} msg2 - A message parsed by {@link parseType2Message}
 * @param {Object} options -
 * @param {String} [options.domain] - Domain name
 * @param {String} [options.workstation] - Workstation name
 * @param {String} [options.username] - Username
 * @param {String} [options.password] - Password
 * @returns {String} The value for an `Authorization` header
 */
function createType3Message (msg2, options) {
    var BODY_LENGTH = 72,
        encryptedRandomSessionKey = '',
        nonce = msg2.serverChallenge,
        negotiateFlags = msg2.negotiateFlags,
        isUnicode = negotiateFlags & flags.NTLM_NegotiateUnicode,
        isNegotiateExtendedSecurity = negotiateFlags & flags.NTLM_NegotiateExtendedSecurity,
        username,
        password,
        domainName,
        workstation,
        workstationBytes,
        domainNameBytes,
        usernameBytes,
        encryptedRandomSessionKeyBytes,
        lmChallengeResponse,
        ntChallengeResponse,
        pwhash,
        clientChallengeBytes,
        challenges,
        flagsToWrite,
        pos = 0,
        buf;

    if (!options.domain) { options.domain = ''; }
    if (!options.workstation) { options.workstation = ''; }
    if (!options.username) { options.username = ''; }
    if (!options.password) { options.password = ''; }

    username = options.username;
    password = options.password;

    // see the note in createType1Message
    domainName = escape(options.domain.toUpperCase());
    workstation = escape(options.workstation.toUpperCase());

    if (isUnicode) {
        workstationBytes = Buffer.from(workstation, 'utf16le');
        domainNameBytes = Buffer.from(domainName, 'utf16le');
        usernameBytes = Buffer.from(username, 'utf16le');
        encryptedRandomSessionKeyBytes = Buffer.from(encryptedRandomSessionKey, 'utf16le');
    }
    else {
        workstationBytes = Buffer.from(workstation, 'ascii');
        domainNameBytes = Buffer.from(domainName, 'ascii');
        usernameBytes = Buffer.from(username, 'ascii');
        encryptedRandomSessionKeyBytes = Buffer.from(encryptedRandomSessionKey, 'ascii');
    }

    lmChallengeResponse = calc_resp(create_LM_hashed_password_v1(password), nonce);
    ntChallengeResponse = calc_resp(create_NT_hashed_password_v1(password), nonce);

    if (isNegotiateExtendedSecurity) {
        /*
         * NTLMv2 extended security is enabled. While this technically can mean NTLMv2 extended security with NTLMv1
         * protocol, servers that support extended security likely also support NTLMv2, so use NTLMv2. This is also how
         * curl implements NTLMv2 "detection". By using NTLMv2, this supports communication with servers that forbid
         * the use of NTLMv1 (e.g. via windows policies)
         *
         * However, the target info is needed to construct the NTLMv2 response so if it can't be negotiated,
         * fall back to NTLMv1 with NTLMv2 extended security.
         */
        pwhash = create_NT_hashed_password_v1(password);
        clientChallengeBytes = crypto.randomBytes(8);

        challenges = msg2.targetInfo ?
            calc_ntlmv2_resp(pwhash, username, domainName, msg2.targetInfo, nonce, clientChallengeBytes) :
            ntlm2sr_calc_resp(pwhash, nonce, clientChallengeBytes);

        lmChallengeResponse = challenges.lmChallengeResponse;
        ntChallengeResponse = challenges.ntChallengeResponse;
    }

    buf = Buffer.alloc(BODY_LENGTH + domainNameBytes.length + usernameBytes.length + workstationBytes.length +
        lmChallengeResponse.length + ntChallengeResponse.length + encryptedRandomSessionKeyBytes.length);

    buf.write(PROTOCOL, pos, PROTOCOL.length); pos += PROTOCOL.length;
    buf.writeUInt32LE(3, pos); pos += 4; // type 3

    buf.writeUInt16LE(lmChallengeResponse.length, pos); pos += 2; // LmChallengeResponseLen
    buf.writeUInt16LE(lmChallengeResponse.length, pos); pos += 2; // LmChallengeResponseMaxLen

    // LmChallengeResponseOffset
    buf.writeUInt32LE(BODY_LENGTH + domainNameBytes.length + usernameBytes.length + workstationBytes.length, pos);
    pos += 4;

    buf.writeUInt16LE(ntChallengeResponse.length, pos); pos += 2; // NtChallengeResponseLen
    buf.writeUInt16LE(ntChallengeResponse.length, pos); pos += 2; // NtChallengeResponseMaxLen

    // NtChallengeResponseOffset
    buf.writeUInt32LE(BODY_LENGTH + domainNameBytes.length + usernameBytes.length + workstationBytes.length +
        lmChallengeResponse.length, pos);
    pos += 4;

    buf.writeUInt16LE(domainNameBytes.length, pos); pos += 2; // DomainNameLen
    buf.writeUInt16LE(domainNameBytes.length, pos); pos += 2; // DomainNameMaxLen
    buf.writeUInt32LE(BODY_LENGTH, pos); pos += 4; // DomainNameOffset

    buf.writeUInt16LE(usernameBytes.length, pos); pos += 2; // UserNameLen
    buf.writeUInt16LE(usernameBytes.length, pos); pos += 2; // UserNameMaxLen
    buf.writeUInt32LE(BODY_LENGTH + domainNameBytes.length, pos); pos += 4; // UserNameOffset

    buf.writeUInt16LE(workstationBytes.length, pos); pos += 2; // WorkstationLen
    buf.writeUInt16LE(workstationBytes.length, pos); pos += 2; // WorkstationMaxLen

    // WorkstationOffset
    buf.writeUInt32LE(BODY_LENGTH + domainNameBytes.length + usernameBytes.length, pos);
    pos += 4;

    buf.writeUInt16LE(encryptedRandomSessionKeyBytes.length, pos); pos += 2; // EncryptedRandomSessionKeyLen
    buf.writeUInt16LE(encryptedRandomSessionKeyBytes.length, pos); pos += 2; // EncryptedRandomSessionKeyMaxLen

    // EncryptedRandomSessionKeyOffset
    buf.writeUInt32LE(BODY_LENGTH + domainNameBytes.length + usernameBytes.length + workstationBytes.length +
        lmChallengeResponse.length + ntChallengeResponse.length, pos);
    pos += 4;

    // see the note on `typeflags` for why this subtracts rather than masks
    flagsToWrite = isUnicode ?
        typeflags.NTLM_TYPE2_FLAGS :
        typeflags.NTLM_TYPE2_FLAGS - flags.NTLM_NegotiateUnicode;

    buf.writeUInt32LE(flagsToWrite, pos); pos += 4; // NegotiateFlags

    buf.writeUInt8(5, pos); pos++; // ProductMajorVersion
    buf.writeUInt8(1, pos); pos++; // ProductMinorVersion
    buf.writeUInt16LE(2600, pos); pos += 2; // ProductBuild
    buf.writeUInt8(0, pos); pos++; // VersionReserved1
    buf.writeUInt8(0, pos); pos++; // VersionReserved2
    buf.writeUInt8(0, pos); pos++; // VersionReserved3
    buf.writeUInt8(15, pos); pos++; // NTLMRevisionCurrent

    domainNameBytes.copy(buf, pos); pos += domainNameBytes.length;
    usernameBytes.copy(buf, pos); pos += usernameBytes.length;
    workstationBytes.copy(buf, pos); pos += workstationBytes.length;
    lmChallengeResponse.copy(buf, pos); pos += lmChallengeResponse.length;
    ntChallengeResponse.copy(buf, pos); pos += ntChallengeResponse.length;
    encryptedRandomSessionKeyBytes.copy(buf, pos); pos += encryptedRandomSessionKeyBytes.length;

    return 'NTLM ' + buf.toString('base64');
}

module.exports = {
    createType1Message,
    parseType2Message,
    createType3Message
};
