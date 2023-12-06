var _ = require('lodash'),
    expect = require('chai').expect,
    aws4 = require('aws4'),
    sdk = require('postman-collection'),
    AuthLoader = require('../../lib/authorizer').AuthLoader,
    createAuthInterface = require('../../lib/authorizer/auth-interface'),
    Request = sdk.Request,
    Url = sdk.Url,
    rawRequests = require('../fixtures/auth-requests'),
    privateKeyMap = {
        // RS & PS
        privatekeyRSA: `-----BEGIN PRIVATE KEY-----
MIIJRAIBADANBgkqhkiG9w0BAQEFAASCCS4wggkqAgEAAoICAQDbuNep/8HvU5ST
JVa2wInmE9bp7o3gHtWccvs6VbQz0bmSA0ATHQ8WrYDawd/ChBUhxw/l9h9wFkIn
2WTN1156C900Qc+K/FiOxTKgVZeTelM8pg+ZMjmaBwbYU/AG5h+62JePtU92wg9I
ukD7liDcBsd2wFR2TJ1GIvA7ybcHcAm+lmQFxCsXfT07vAXMUGTAWmFKmZ0AgsBM
+bMC/AprZfcXqUuwHYGs0i+MSdLP+H+PDP+CFyi4oINmqM4ZNBMVrHhIsOwZya7y
W1k2ZY3Xgj6d1Yk9YTUxjbgjU87zFzVdm3EOoPSz3PBRjWjqAAiULAPTxfRrPsEp
9caC7hn8fy4xc3XXCNNwa9MOkjukk9kVTD3UwWEAvw/pPTiplWCYpRQ2/mkUJQru
AAW4fhAm5vz21Jc9Vxp1BvtKOmWKmmcK/gBQVtxFbSIJm8p+vI4sF3bEsnlCXLVB
EN928b3i5MU+GGTAI1TnSB94ca4/7SmvhAU8/OrLeAcfcpo5TqSNl/FEvJ7ZuY0P
v8dQz3gbdRbRtn5X9fc0032gZrO6XHdPQ9lqJMxmUOkyxMDLf342AUjZ8m7ssRuV
db8BmYqqy5yhTOYHfQ2QstEgqNSgaRKbFYDD4xB3adQuVeb7UjEY2Pk/XHTcKHNC
tOzH9xX8gV4iK4cLCEs5DZ+GzmQDUQIDAQABAoICAQChnurMenveHl3Iiwuo7CHD
Ys6QTtB/jk7UgON5endOMrPMyqVEKfjiVofU4g1E2MFuki2Imy1u1oCdLVTv8L7n
CXkSKmKOuqYthrKBq9QOQEmf8ArDRmWGfiqzz7JccMPgPdfmdpjYI1D4z0Bjj3/m
OPpZyImYZyy83ZBWej8usmQIlDlI4I5N/eqf2ONu8afaseCk7i/Fo2fudzINPPYx
H9TMy9QH3Px48jbVe6wdHI4/3HDJ8V0byb4+Mmc/tMVhCPeFiNZy9Z7BWR5bXAIl
BwImOV91Dd8B71wGaGxu9aBklaVo/E5jS15erqUAkzu8OlAqY48xn/yYb9gwkRH9
A1FlCVaT8VUGcjruE6hmhyO+w5C8FzC9E1x23bBa0csSaUNDRtxBbdVmT3CE2RqR
+omhDRCIRJ91bxet/vfktvC/sQuldSkKHWpxLtp7IBbZfi0wIqX83mxc9uXcvikO
N530lxNRZUYeKenmkR8uQQzLf3TdrdnMvKkFbWqJ/rUsneLQVrKt7LztvxEdxgL1
5KYwPoLc2YkOiNX9pSo9eg4rYLGWy2JVQk2zYh9blqJruRUmvw3072t8BE74Do2X
VCjDUa/821zhIATheqUZ4pvrYtl+dfZpYvVdNOlDrvkVRNI8gaXq1BSWoig4Eg32
eOevue9wtMDi9tETrENtEQKCAQEA8trU0z2a9XZ5ZKvjCNy9SwXaRoa07D/thNv9
qTrtp7cuPivU7D57/1JKRxcqAAaIYl6Ei/HMMscvgXwoE4iWUGLYlKYmeeA6PbCe
5IQVuLNDvzzQYfHRfbwEsGsa5CZG26ImNCOzmM2XV0PXojd+oyBtp7AqVUFNH0wB
eszpo/WWLgvJJ2zYkh88bWKkXIWnxqHOVFx1+zQ4m5A6XvjBJGzhKIJ1ZGecKABB
wF48BO3j6sPQVFxPkouVM5gOCykj2NJETmMXsEIQuK5TWQwhAQBLwniHlH9b9/wA
/syaELS/62UbU6RXMSqWJ9pEOHGyKcEjfgo/fksIqnshF8ATlQKCAQEA5513jnVU
Zzhou8ppPvrKSr2g07RPx+QlqMopaXVvEHucsKO3YeT2YAvwLs71QE6QabfmySEK
XkeLu6rwTf2vIzdGTNls5HxMvtkp4RiyuIg14HY/UeoYabZzJa35cDEssY/UIV32
N950QjwRgMJiW9NqzYJLuOsfPrSuK6HKPwIcNDoWXP1Xy/vw0OYrW2bruHYlGHXN
M/iwcyWALulNukEhbMUfqk/wAP3bCcbGcRhfPT532FMM8yRmEjRPfNOYibJQqTVX
1bUM1N9jg7Hkx2ZutHU/GQcZDDhTsNNa4yhjXm2QZPgySFRZDnY3fv2hXBQYBsFF
CmzSGiUO+03BzQKCAQEAr7s368+VVO+w8e8LbztD4ojOpOAPBTFRLyV9TTruA8Gi
vaw7++NPGLc0NnMFmlUf1YathRKn/0pxDtKHsXLRykNsk0wTZXeizUcEAzms+iUF
7dkUtPsl60TlY79tCxDDj2SrHmmDKRwD2kqmO6TKh0IM9x2b1GtXYkE+hNzIaDNq
w9EVcujpYfsmX8TUSHsSp8IoKpVpbiggmjjodBautCvxVb3pMolizvM4oPnPloWJ
ujSNiK3vioxkn5v09ZCEdv3YHZzI5Gs57FmAyFvlefL73zIWcZcjNrPtCHOHPHV+
tthHyOOPkG1PkHD5kpp7IIm4pBjITxv+nlZQ4P3FbQKCAQEA2mP1DmN9cVKUFrYV
pOfOhMjm85eqPl3WUKBGigTL86vKpBfK20iMMyYuk8RbJgauTrCzsOQxpZIqpIra
yX8xe7Ar3lyJO6wkpTOZNIEYS71Lp9l3fSKRYGRDkLzJXUtQzCBFMi0p86YS0z1W
d6VSHylrJFn+Ul+I95RgQg3s6Jpxw6Ed4xKSjWmCuUa+jRGvpB/qfHTfR2jv37L1
ecZMnxm4jZoVcH6tXBIBTeeax5rmepYDZPtyU3T3taSTaq0NwJBdVB9TMdPkRHha
mhvMD2R7cDa5hzzVFluqNiokIdq8T5ZZt4r7xo2Z53P6gghe9LaRrRThp6HSPgrB
ZJ395QKCAQBg8gzEUDIah6nV1Wx8MWFwr+cdi7XQige7p9LsOaouCchiBYlsO1D+
pQKJdlK22hWbMKuBR8aO0WttwmFy1jInyxNHxzuDqKP+mYUawavvjJkOq1wF9jtz
3mvI/dJSdYoFTM3If9wIfh/oK4s8HmD9N0K9pM2edhs3WpubqSFwyTRn3GXZV8Lc
DVJ0ryAouWAd4zQ4YEfOymbW45M2Rt4oKp2mM61SpNkosW6aVfY1Bx+xIZYh5d3n
ltBJRIyPOw6SMxhgzaLVXiL6B2B1YMjS79iBOWsxoH7CXIltbNmWWKGOffonR23B
gMVKySHK/rZTODTDcfx9d+nr5l3et2/w
-----END PRIVATE KEY-----`, // fileName inside - test/fixtures/jwt-keys/
        publicKeyRSA: `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA27jXqf/B71OUkyVWtsCJ
5hPW6e6N4B7VnHL7OlW0M9G5kgNAEx0PFq2A2sHfwoQVIccP5fYfcBZCJ9lkzdde
egvdNEHPivxYjsUyoFWXk3pTPKYPmTI5mgcG2FPwBuYfutiXj7VPdsIPSLpA+5Yg
3AbHdsBUdkydRiLwO8m3B3AJvpZkBcQrF309O7wFzFBkwFphSpmdAILATPmzAvwK
a2X3F6lLsB2BrNIvjEnSz/h/jwz/ghcouKCDZqjOGTQTFax4SLDsGcmu8ltZNmWN
14I+ndWJPWE1MY24I1PO8xc1XZtxDqD0s9zwUY1o6gAIlCwD08X0az7BKfXGgu4Z
/H8uMXN11wjTcGvTDpI7pJPZFUw91MFhAL8P6T04qZVgmKUUNv5pFCUK7gAFuH4Q
Jub89tSXPVcadQb7SjplippnCv4AUFbcRW0iCZvKfryOLBd2xLJ5Qly1QRDfdvG9
4uTFPhhkwCNU50gfeHGuP+0pr4QFPPzqy3gHH3KaOU6kjZfxRLye2bmND7/HUM94
G3UW0bZ+V/X3NNN9oGazulx3T0PZaiTMZlDpMsTAy39+NgFI2fJu7LEblXW/AZmK
qsucoUzmB30NkLLRIKjUoGkSmxWAw+MQd2nULlXm+1IxGNj5P1x03ChzQrTsx/cV
/IFeIiuHCwhLOQ2fhs5kA1ECAwEAAQ==
-----END PUBLIC KEY-----
        `,
        invalidPublicKeyRSA: `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAtUxvcPYA3IKl19HxJXvh
nHAIEzXCRF8z13dCIx8+AfLmiY5C/fA4k+jiXtXwQcAtzUHtj27V/imWv5uYQdWh
8l8rBsRdA9uLWxzXA5qc4w+cCoNvpPPmtR/aik4u6tCMQl85bQivaMrzUQKRlMyo
MhDncVlRx+yJ+HqfoL8LYbrYfIy6RYeMGDr3R8T+VWJ3B6VyDKPVoXFw4GOqNsA1
uU8NTjBjKp+iOLOwTuPr4Txi+/eTKptJiMDwYBXgaQSfvOAPjaAkC4sWc17ZyE1l
sZAu2qO6ntAtE4K/wAddOc08+h8y9SANdG81yV+z/uI9BfaBX+X9uSifxm0HCF5Q
YqO/fF5ckQk8Obgmh6cQ009WPNhS2IvL5KjPdpyYKGLXuWnaogKTVzrroiY1kEV3
tpfep61qYsrnzkfnRb7G0puiL0tl45gTLDN6c4J4LdhElSpOtI6yb59nCjjycmjs
yArBlhaeHTmVDPTLWmfppi9jDzRxUF9QRMjrVLTurvTcSzKcOGFWjegrkpGOomrg
9wuaEp3hZhT0qxxuG1ODYoyMXyF9yDP4WCRIKVFgp+WNXzkoJ3FY7uEQoa13HWBv
LjyNTSDWlGFpnKW1h5ByEoZxr75uQnKXRp3bd+6kfZ1Spq0sTABO9YTUuLlHpirc
q7SQ+Ojyvg0I+Zs6EGfvqw0CAwEAAQ==
-----END PUBLIC KEY-----`,
        // ES - ECDSA
        privateKeyECDSA256: `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgrgMoQc7DG9l2l/Mx
nAASnzHMjMMmYc7B6gkmQFL1PrChRANCAAStTgjJpgcmnD+couFzrU16ncK5L0Pg
InGu0p2AUTbssr3lnsbVo4uUmyc7xkkcmEXl0NkLCuvxsIYjYUFcBwNb
-----END PRIVATE KEY-----`,
        publicKeyECDSA256: `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAErU4IyaYHJpw/nKLhc61Nep3CuS9D
4CJxrtKdgFE27LK95Z7G1aOLlJsnO8ZJHJhF5dDZCwrr8bCGI2FBXAcDWw==
-----END PUBLIC KEY-----`,
        privateKeyECDSA384: `-----BEGIN PRIVATE KEY-----
MIG2AgEAMBAGByqGSM49AgEGBSuBBAAiBIGeMIGbAgEBBDASr1++UleLCWj7P7D+
Or+NZZybIWzW9z+MxhEBv2SK+bC5gyzYro5TaDJ2Vn39qRqhZANiAARbnsyK0sry
rlLHOBFAdhwetoyiPrl7n5dmi+lrMRNBQNzFw1bIQU9tN94TuVy/1O4IEM8DeuD5
ekVtY/ucq+Tjik/yZKJHvLsAZk/1GGjjq8V1mMVid0KMPOY//b7Ls2o=
-----END PRIVATE KEY-----`,
        publicKeyECDSA384: `-----BEGIN PUBLIC KEY-----
MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEW57MitLK8q5SxzgRQHYcHraMoj65e5+X
ZovpazETQUDcxcNWyEFPbTfeE7lcv9TuCBDPA3rg+XpFbWP7nKvk44pP8mSiR7y7
AGZP9Rho46vFdZjFYndCjDzmP/2+y7Nq
-----END PUBLIC KEY-----`,
        privateKeyECDSA512: `-----BEGIN PRIVATE KEY-----
MIHtAgEAMBAGByqGSM49AgEGBSuBBAAjBIHVMIHSAgEBBEG01HA0X3S8b7aNvR5i
wWoMkLTs941ZdDgldbmrGMO1FFCm82N8yTihcdupa3QEod8GZ7Vzqrlhpgdgq7Wd
wcp6jKGBiQOBhgAEAK9P/yQ+b7izWZlB3MYdoeHvfyH4s/gbjSscXX1O2tW66vhC
iswRl13ApzjtA1o1z+M193ilcROyb8DgPVTKXWc2AGF4Me/CanB+gu0xAtqEN94/
in/uvzF/rmQgmOFwBmmDOqxmBDJqBWcaRWTQugQ/XHvOFoCzoPb0+lZ4kyUajuBH
-----END PRIVATE KEY-----`,
        publicKeyECDSA512: `-----BEGIN PUBLIC KEY-----
MIGbMBAGByqGSM49AgEGBSuBBAAjA4GGAAQAr0//JD5vuLNZmUHcxh2h4e9/Ifiz
+BuNKxxdfU7a1brq+EKKzBGXXcCnOO0DWjXP4zX3eKVxE7JvwOA9VMpdZzYAYXgx
78JqcH6C7TEC2oQ33j+Kf+6/MX+uZCCY4XAGaYM6rGYEMmoFZxpFZNC6BD9ce84W
gLOg9vT6VniTJRqO4Ec=
-----END PUBLIC KEY-----`
    },
    RSA_BASE64_DER = `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`,
    RSA_BASE64_DER_INVALID = `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
+)(_*)&(^*%&*()_*&^&()__*&^**(_)+(*)&()*&(()&)*(&*+7N+vPlVTvsPHv
C287Q+KIzqTgDwUxUS8lfU067gPBor2sO/vjTxi3NDZzBZpVH9WGrYUSp/9KcQ7S
h7Fy0cpDbJNME2V3os1HBAM5rPolBe3ZFLT7JetE5WO/bQsQw49kqx5pgykcA9pK
pjukyodCDPcdm9RrV2JBPoTcyGgzasPRFXLfdgt4sefE1Eh7EqfCKCqVaW4oIJo4
6HQWrrQr8VW96TKJYs7zOKD5z5aFibo0jYit74qMZJ+b9PWQhHb92B2cyORrOexZ
gMhb5Xny+98yFnGXIzaz7Qhzhzx1frbYR8jjj5BtT5Bw+ZKaeyCJuKQYyE8b/p5W
UOD9xW0CggEBANpj9Q5jfXFSlBa2FaTnzoTI5vOXqj5d1lCgRooEy/OryqQXyttI
jDMmLpPEWyYGrk6ws7DkMaWSKqSK2sl/MXuwK95ciTusJKUzmTSBGEu9S6fZd30i
kWBkQ5C8yV1LUMwgRTItKfOmEtM9VnelUh8payRZ/lJfiPeUYEIN7OiaccOhHeMS
ko1pgrlGvo0Rr6Qf6nx030do79+y9XnGTJ8ZuI2aFXB+rVwSAU3nmsea5nqWA2T7
clN097Wkk2qtDcCQXVQfUzHT5ER4WpobzA9ke3A2uYc81RZbqjYqJCHavE+WWbeK
+8aNmedz+oIIXvS2ka0U4aeh0j4KwWSd/eUCggEAYPIMxFAyGoep1dVsfDFhcK/n
HYu10IoHu6fS7DmqLgnIYgWJbDtQ/qUCiXZSttoVmzCrgUfGjtFrbcJhctYyJ8sT
R8c7g6ij/pmFGsGr74yZDqtcBfY7c95ryP3SUnWKBUzNyH/grgsdfgfdfB5g/TdC
vaTNnnYbN1qbm6khcMk0Z9xl2VfC3A1SdK8gKLlgHeM0OGBHzspm1uOTNkbeKCqd
pjOtUqTZKLFumlX2NQcfsSGWIeXd55bQSUSMjzsOkjMYYM2i1V4i+gdgdWDI0u/Y
gTlrMaB+wlyJbWzZllihjn36J0dtwYDFSskhyv62Uzg0w3H8fXfp6+Zd3rdv8A==`,
    // RS algorithms
    RSAlgorithms = {
        RS256: {
            alg: 'RS256',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        },
        RS384: {
            alg: 'RS384',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        },
        RS512: {
            alg: 'RS512',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        }
    },

    // PS algorithms
    PSAlgorithms = {
        PS256: {
            alg: 'PS256',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        },
        PS384: {
            alg: 'PS384',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        },
        PS512: {
            alg: 'PS512',
            signKey: () => {
                return privateKeyMap.privatekeyRSA;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyRSA;
            }
        }
    },

    // ES algorithms
    ESAlgorithms = {
        ES256: {
            alg: 'ES256',
            signKey: () => {
                return privateKeyMap.privateKeyECDSA256;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyECDSA256;
            }
        },
        ES384: {
            alg: 'ES384',
            signKey: () => {
                return privateKeyMap.privateKeyECDSA384;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyECDSA384;
            }
        },
        ES512: {
            alg: 'ES512',
            signKey: () => {
                return privateKeyMap.privateKeyECDSA512;
            },
            publicKey: () => {
                return privateKeyMap.publicKeyECDSA512;
            }
        }
    },

    // all Algorithms
    algorithmsSupported = {
        ...RSAlgorithms,
        ...PSAlgorithms,
        ...ESAlgorithms
    },
    algorithms = Object.entries(algorithmsSupported),
    compulsoryParams = [
        'kid',
        'iss',
        'aud',
        'privateKey'
    ],
    getAsapRequestsForAlg = require('../fixtures/get-auth-requests').getAsapRequestsForAlg;

function getRSADerKeyForKeyId (keyId, base64DerKey) {
    return `data:application/pkcs8;kid=${encodeURIComponent(keyId)};base64,${base64DerKey}`;
}

describe('Auth Handler:', function () {
    describe('noauth', function () {
        it('should work correctly', function () {
            var request = new Request({
                    auth: {
                        noauth: {},
                        type: 'noauth'
                    }
                }),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request).to.eql(request);
            authInterface.set({ foo: 'bar' });

            handler.sign(authInterface, request, _.noop);
            expect(request.auth.parameters().toObject()).to.eql({
                foo: 'bar'
            });
        });
    });

    describe('bearer token', function () {
        var requestObj = {
            auth: {
                type: 'bearer',
                bearer: {
                    token: '123456789abcdefghi'
                }
            },
            method: 'GET'
        };

        it('should add the auth header', function () {
            var request = new Request(requestObj),
                authInterface = createAuthInterface(request.auth),
                expectedAuthHeader = 'Authorization: Bearer ' + requestObj.auth.bearer.token,
                handler = AuthLoader.getHandler(request.auth.type),
                headers,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();

            expect(headers).to.have.lengthOf(1);

            authHeader = headers[0];
            expect(authHeader.toString()).to.eql(expectedAuthHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should return without signing the request when token is missing', function () {
            var clonedRequestObj = _.clone(requestObj),
                request,
                authInterface,
                handler,
                valuesToCheck = [null, undefined, NaN];

            _.forEach(valuesToCheck, function (value) {
                clonedRequestObj.auth.bearer.token = value;
                request = new Request(clonedRequestObj);
                authInterface = createAuthInterface(request.auth);
                handler = AuthLoader.getHandler(request.auth.type);

                handler.sign(authInterface, request, _.noop);

                expect(request.headers.all()).to.be.an('array').that.is.empty;
            });
        });
    });

    describe('basic', function () {
        it('should add the Auth header', function () {
            var request = new Request(rawRequests.basic),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                username = rawRequests.basic.auth.basic.username,
                password = rawRequests.basic.auth.basic.password,
                expectedAuthHeader = 'Authorization: Basic ' +
                                     Buffer.from(`${username}:${password}`, 'utf8').toString('base64'),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();

            expect(headers).to.have.lengthOf(1);

            authHeader = headers[0];
            expect(authHeader.toString()).to.eql(expectedAuthHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should generate correct header for parameters with unicode characters', function () {
            var rawBasicReq = _.cloneDeep(rawRequests.basic),
                request,
                authInterface,
                handler;

            rawBasicReq.auth.basic = { username: '中文', password: '文中' };
            request = new Request(rawBasicReq);
            authInterface = createAuthInterface(request.auth);
            handler = AuthLoader.getHandler(request.auth.type);
            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([
                {
                    key: 'Authorization',
                    value: 'Basic ' + Buffer.from('中文:文中', 'utf8').toString('base64'),
                    system: true
                }
            ]);
        });

        it('should use default values for the missing parameters', function () {
            var rawBasicReq = _.cloneDeep(rawRequests.basic),
                request,
                authInterface,
                handler;

            rawBasicReq.auth.basic = { username: 'foo' }; // no password present
            request = new Request(rawBasicReq);
            authInterface = createAuthInterface(request.auth);
            handler = AuthLoader.getHandler(request.auth.type);
            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([
                {
                    key: 'Authorization',
                    value: 'Basic ' + Buffer.from('foo:', 'utf8').toString('base64'),
                    system: true
                }
            ]);

            rawBasicReq.auth.basic = { password: 'foo' }; // no username present
            request = new Request(rawBasicReq);
            authInterface = createAuthInterface(request.auth);
            handler = AuthLoader.getHandler(request.auth.type);
            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([
                {
                    key: 'Authorization',
                    value: 'Basic ' + Buffer.from(':foo', 'utf8').toString('base64'),
                    system: true
                }
            ]);

            rawBasicReq.auth.basic = {}; // no username and no password present
            request = new Request(rawBasicReq);
            authInterface = createAuthInterface(request.auth);
            handler = AuthLoader.getHandler(request.auth.type);
            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([
                {
                    key: 'Authorization',
                    value: 'Basic ' + Buffer.from(':', 'utf8').toString('base64'),
                    system: true
                }
            ]);
        });
    });

    describe('digest', function () {
        it('should add the Auth header for (algorithm="MD5", qop=""', function () {
            var request = new Request(rawRequests.digest),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5", response="63db383a0f03744cfd45fe15de8dbe9d", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5", qop=auth, nc=00000001, cnonce="0a4f113b", ' +
                'response="f83809617b00766c6f9840256eb1199e", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5", qop=auth-int, nc=00000001, cnonce="0a4f113b", ' +
                'response="65d355634828a04d3a73717dc810a4bf", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5-sess", qop="")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'MD5-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5-sess", nc=00000001, cnonce="0a4f113b", ' +
                'response="3bf3901b3461fe15de194fa866154c21", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5-sess", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            qop: 'auth',
                            algorithm: 'MD5-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5-sess", qop=auth, nc=00000001, cnonce="0a4f113b", ' +
                'response="52aa69a8b63d81b51e2d02ecebaa705e", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="MD5-sess", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            qop: 'auth-int',
                            algorithm: 'MD5-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                expectedHeader,
                authHeader;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", ' +
                'algorithm="MD5-sess", qop=auth-int, nc=00000001, cnonce="0a4f113b", ' +
                'response="eb2ec4193a936809d035976f5f20cc65", opaque="5ccc069c403ebaf9f0171e9517f40e"';
            authHeader;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];

            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256", qop=""', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256", response="640a149858bc1b2a90a02453a328bad01c1bad5dad6ba92cf0bf7832fd7dcae2", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256',
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256", qop=auth, nc=00000001, cnonce="0a4f113b", response="6025934347a57283989281f03d9c4e1adbb3ee50af57827c83182d87e0cb7ec0", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256',
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="06ba0831e0043ddc784784a1915acfd6d58792ab8203edaff5082800f8d294a5", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256-sess", qop="")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256-sess", response="0b4e18576fd9f4850dda49eab2a581a5f40bb50f6ecaa17ab4340cd416497e13", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256-sess", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256-sess',
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256-sess", qop=auth, nc=00000001, cnonce="0a4f113b", response="9388df8d879c3d988419aafca225ccc4626eb089192e992239b5595a532e243d", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-256-sess", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-256-sess',
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-256-sess", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="31ecccb1899773a8d2478e6f7042f3174485ce18949731e84c572a1dd48d1539", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256", qop=""', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", response="1676ceef7b880281567d30ca03f2517131fbc4a0c0a16d577cc4ad477b6b8c52", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth, nc=00000001, cnonce="0a4f113b", response="fb53cf8c6922b758cf05477afd5cd896ad0213f16588ed15089da72a2900cb19", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="f928c7ae0b0d4e4fe870e2fe66ccb85362e08b7c9ac33dcc527915019dec7aa2", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256-sess", qop="")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256-sess'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256-sess", response="501c722984db1ecab705757c060e359debac8c9ee98bea00fc70c111977fcaba", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256-sess", qop="auth")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256-sess',
                            qop: 'auth'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256-sess", qop=auth, nc=00000001, cnonce="0a4f113b", response="5b0af1e60cff4aaa751326f6e837ea5d32c77324254f6c0c9882ff6cc0947799", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header for (algorithm="SHA-512-256-sess", qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256-sess',
                            qop: 'auth-int'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256-sess", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="6e12487570a4f493953dd7e378924eee9a61dea0e6f0ee59854cf2c77c223f53", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add correct Auth header for request with raw body and (qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth-int'
                        }
                    },
                    body: {
                        mode: 'raw',
                        raw: 'Hello Postman!!!'
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="08af7d82b032a502331788f1e56e16337910c11a887b99c60abf86e9c26fab2a", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add correct Auth header for request with urlencoded body and (qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth-int'
                        }
                    },
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [
                            { key: 'foo', value: 'bar' },
                            { key: 'postman', value: '邮差' },
                            { key: 'alpha', value: 'beta', disabled: true }
                        ]
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="cbfd61ad1bc2a4c9bb3d058e2b9b9d231e11501261c2115a8f23f787d296d6f4", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add correct Auth header for request with GraphQL body and (qop="auth-int")', function () {
            var clonedReqObj = _.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'SHA-512-256',
                            qop: 'auth-int'
                        }
                    },
                    body: {
                        mode: 'graphql',
                        graphql: {
                            query: 'query Test { hello }',
                            operationName: 'Test',
                            variables: '{"foo":"bar"}'
                        }
                    }
                }),
                request = new Request(clonedReqObj),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,

                // eslint-disable-next-line max-len
                expectedHeader = 'Authorization: Digest username="postman", realm="Users", nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth", algorithm="SHA-512-256", qop=auth-int, nc=00000001, cnonce="0a4f113b", response="88f80bf9c08dd1250ae6fa848f48147aaebc0d56b7f41f04ccd8de4f217d0256", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader = headers[0];

            expect(headers).to.have.lengthOf(1);
            expect(authHeader.toString()).to.eql(expectedHeader);
            expect(authHeader.system).to.be.true;
        });

        it('should add the Auth header with query params in case of request with the same', function () {
            var request = new Request(rawRequests.digestWithQueryParams),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                authHeader,
                expectedHeader;

            handler.sign(authInterface, request, _.noop);
            authHeader = request.headers.one('Authorization');
            expectedHeader = 'Authorization: Digest username="postman", realm="Users", ' +
                'nonce="bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp", uri="/digest-auth?key=value", ' +
                'algorithm="MD5", response="24dfb8851ee27e4b00252a13b1fd8ec3", opaque="5ccc069c403ebaf9f0171e9517f40e"';

            expect(authHeader.toString()).to.eql(expectedHeader);
        });

        it('should give error for unsupported algorithm', function () {
            var request = new Request(_.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: 'Unknown algorithm'
                        }
                    }
                })),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function (err) {
                expect(err).to.be.ok;
            });
        });

        it('should default to MD5 algorithm when not provided', function () {
            var request = new Request(_.merge({}, rawRequests.digest, {
                    auth: {
                        digest: {
                            algorithm: null
                        }
                    }
                })),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                authHeader;

            handler.sign(authInterface, request, _.noop);
            authHeader = request.headers.one('Authorization');

            expect(authHeader.toString()).to.include('algorithm="MD5"');
        });

        it('should bail out for invalid requests', function () {
            var request = new Request(_.omit(rawRequests.digest, 'auth.digest.username')),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            // Since Nonce and Timestamp have to be generated at runtime, cannot assert anything beyond this.
            expect(request.toJSON()).to.eql({
                url: {
                    host: ['postman-echo', 'com'],
                    path: ['digest-auth'],
                    protocol: 'https',
                    query: [],
                    variable: []
                },
                method: 'GET',
                auth: {
                    type: 'digest',
                    digest: [{
                        key: 'realm',
                        type: 'any',
                        value: 'Users'
                    },
                    {
                        key: 'password',
                        type: 'any',
                        value: 'password'
                    },
                    {
                        key: 'nonce',
                        type: 'any',
                        value: 'bcgEc5RPU1ANglyT2I0ShU0oxqPB5jXp'
                    },
                    {
                        key: 'nonceCount',
                        type: 'any',
                        value: '00000001'
                    },
                    {
                        key: 'algorithm',
                        type: 'any',
                        value: 'MD5'
                    },
                    {
                        key: 'qop',
                        type: 'any',
                        value: ''
                    },
                    {
                        key: 'clientNonce',
                        type: 'any',
                        value: '0a4f113b'
                    },
                    {
                        key: 'opaque',
                        type: 'any',
                        value: '5ccc069c403ebaf9f0171e9517f40e'
                    }]
                }
            });
        });
    });

    describe('oauth1', function () {
        it('should add the Auth header', function () {
            var request = new Request(rawRequests.oauth1),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHeader,
                authHeaderValueKeys;

            handler.sign(authInterface, request, _.noop);
            headers = request.headers.all();
            authHeader;
            authHeaderValueKeys;

            expect(headers).to.have.lengthOf(1);
            authHeader = headers[0];
            // Since Nonce and Timestamp have to be generated at runtime, cannot assert anything beyond this.
            expect(authHeader.key).to.equal('Authorization');
            authHeaderValueKeys = authHeader.value.split(',').map((val) => {
                return val.split('=')[0];
            });
            expect(authHeaderValueKeys).to.eql([
                'OAuth realm',
                'oauth_consumer_key',
                'oauth_signature_method',
                'oauth_timestamp',
                'oauth_nonce',
                'oauth_version',
                'oauth_signature'
            ]);
            expect(authHeader.system).to.be.true;
        });

        it('should bail out if consumerKey is absent', function () {
            var request = new Request(_.omit(rawRequests.oauth1, ['header', 'auth.oauth1.consumerKey'])),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
        });

        it('should bail out if consumerSecret is absent for HMAC signature', function () {
            var request = new Request(_.omit(rawRequests.oauth1, ['header', 'auth.oauth1.consumerSecret'])),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
        });

        it('should bail out if consumerSecret is absent for PLAINTEXT signature', function () {
            var request = new Request(_(rawRequests.oauth1).omit(['header', 'auth.oauth1.consumerSecret']).merge({
                    auth: {
                        oauth1: {
                            signatureMethod: 'PLAINTEXT'
                        }
                    }
                }).value()),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
        });

        it('should bail out if privateKey is absent for RSA signature', function () {
            var request = new Request(_(rawRequests.oauth1).omit(['header', 'auth.oauth1.consumerSecret']).merge({
                    auth: {
                        oauth1: {
                            signatureMethod: 'RSA-SHA1',
                            privateKey: undefined
                        }
                    }
                }).value()),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
        });

        it('should pass invalid privateKey error in callback for RSA signature', function () {
            var request = new Request(_(rawRequests.oauth1).omit(['header', 'auth.oauth1.consumerSecret']).merge({
                    auth: {
                        oauth1: {
                            signatureMethod: 'RSA-SHA1',
                            privateKey: 'invalid key'
                        }
                    }
                }).value()),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function (err) {
                expect(err).to.be.ok;
            });
        });

        it('should apply sensible defaults where applicable', function () {
            var rawReq = _(rawRequests.oauth1).omit(['auth.oauth1.nonce', 'auth.oauth1.timestamp']).merge({
                    url: {
                        host: ['postman-echo', 'com'],
                        path: ['auth', 'oauth1'],
                        protocol: 'https',
                        query: [],
                        variable: []
                    },
                    auth: {
                        oauth1: {
                            addEmptyParamsToSign: true,
                            addParamsToHeader: false
                        }
                    },
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{
                            key: 'oauth_token',
                            value: 'secret'
                        }, {
                            key: 'foo',
                            value: 'bar'
                        }]
                    }
                }).value(),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;

            expect(request.auth.parameters().toObject()).to
                .eql({
                    consumerKey: 'RKCGzna7bv9YD57c',
                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                    token: '',
                    tokenSecret: '',
                    signatureMethod: 'HMAC-SHA1',
                    version: '1.0',
                    realm: 'oauthrealm',
                    addParamsToHeader: false,
                    autoAddParam: true,
                    addEmptyParamsToSign: true
                });
        });

        it('should correctly handle the GET request method', function () {
            var rawReq = _(rawRequests.oauth1).omit(['auth.oauth1.nonce', 'auth.oauth1.timestamp']).merge({
                    method: 'GET',
                    url: 'https://postman-echo.com/auth/oauth1',
                    auth: {
                        oauth1: {
                            addEmptyParamsToSign: true,
                            addParamsToHeader: false
                        }
                    },
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{
                            key: 'oauth_token',
                            value: 'secret'
                        }, {
                            key: 'foo',
                            value: 'bar'
                        }]
                    }
                }).value(),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            expect(request.url.query.reference).to.deep.include.keys([
                'oauth_consumer_key', 'oauth_token', 'oauth_signature_method', 'oauth_timestamp', 'oauth_nonce',
                'oauth_version', 'oauth_signature'
            ]);
            // All the query paramters added by runtime must have `system: true` property
            _.forEach(request.url.query.members, function (param) {
                expect(param.system).to.be.true;
            });
            expect(request.auth.parameters().toObject()).to
                .eql({
                    consumerKey: 'RKCGzna7bv9YD57c',
                    consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                    token: '',
                    tokenSecret: '',
                    signatureMethod: 'HMAC-SHA1',
                    version: '1.0',
                    realm: 'oauthrealm',
                    addParamsToHeader: false,
                    autoAddParam: true,
                    addEmptyParamsToSign: true
                });
        });

        it('should include body hash when includeBodyHash:true', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            includeBodyHash: true
                        }
                    },
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.get('Authorization')).to.include('oauth_body_hash');
        });

        it('should not include body hash when includeBodyHash:false', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            includeBodyHash: false
                        }
                    },
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.get('Authorization')).to.not.include('oauth_body_hash');
        });

        it('should not include body hash for url-encoded body when includeBodyHash:true', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            includeBodyHash: true
                        }
                    },
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{
                            key: 'haha',
                            value: 'somevalue'
                        }]
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.get('Authorization')).to.not.include('oauth_body_hash');
        });

        it('should include correct body hash for empty body', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            addParamsToHeader: false,
                            includeBodyHash: true
                        }
                    },
                    body: {}
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_body_hash')).to.eql('2jmj7l5rSw0yVb%2FvlWAYkK%2FYBwk%3D');
        });

        it('should include correct body hash for raw body', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            addParamsToHeader: false,
                            includeBodyHash: true
                        }
                    },
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_body_hash')).to.eql('pqfIFYs01VSVSkySGxRPgtddtoM%3D');
        });

        it('should include correct body hash for GraphQL body', function () {
            var rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            addParamsToHeader: false,
                            includeBodyHash: true
                        }
                    },
                    body: {
                        mode: 'graphql',
                        graphql: {
                            query: 'query Test { hello }',
                            operationName: 'Test',
                            variables: '{"foo":"bar"}'
                        }
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_body_hash')).to.eql('2jwsdzjZEuFdm6ubMtk0HZi34%2BU%3D');
        });

        it('should include all non-empty oauth1 params in request', function () {
            var rawReq = {
                    url: 'https://postman-echo.com/oauth1',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: '1461319769',
                            nonce: 'ik3oT5',
                            version: '1.0',
                            realm: 'foo',
                            verifier: 'bar',
                            callback: 'http://postman.com',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: false
                        }
                    }
                },
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.toObject()).to.include({
                    oauth_consumer_key: 'RKCGzna7bv9YD57c',
                    oauth_token: 'foo',
                    oauth_signature_method: 'HMAC-SHA1',
                    oauth_timestamp: '1461319769',
                    oauth_nonce: 'ik3oT5',
                    oauth_version: '1.0',
                    oauth_callback: 'http%3A%2F%2Fpostman.com',
                    oauth_verifier: 'bar',
                    oauth_signature: 'WHnpdWcwWzBM3bHcRQNshHVh2Og%3D'
                });
            });
        });

        // issue: https://github.com/postmanlabs/postman-app-support/issues/8737
        it('should generate correct signature for empty callback and addEmptyParamsToSign:true', function () {
            var rawReq = {
                    url: 'https://postman-echo.com/oauth1',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: '1461319769',
                            nonce: 'ik3oT5',
                            version: '1.0',
                            verifier: 'bar',
                            callback: '',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: true
                        }
                    }
                },
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.get('oauth_signature')).to.eql('w8WS1SXfe%2FdtJu%2F4tH5DaD7qZgM%3D');
            });
        });

        // issue: https://github.com/postmanlabs/postman-app-support/issues/8737
        it('should generate correct signature for empty verifier and addEmptyParamsToSign:true', function () {
            var rawReq = {
                    url: 'https://postman-echo.com/oauth1',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: '1461319769',
                            nonce: 'ik3oT5',
                            version: '1.0',
                            verifier: '',
                            callback: 'http://postman.com',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: true
                        }
                    }
                },
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.get('oauth_signature')).to.eql('WO1RMBRLIM5Anfxxt8P7Kbt82b4%3D');
            });
        });

        it('should generate correct signature for RSA based signature method', function () {
            // eslint-disable-next-line max-len
            var privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgFKLvzM9zbm3I0+HWcHlBSqpfRY/bKs6NDLclERrzfnReFV4utjkhjaEQPPT6tHVHKrZkcxmIgwe3XrkJkUjcuingXIF+Fc3KpY61qJ4HSM50qIuHdi+C5YfuXwNrh6OOeZAhhqgSw2e2XqPfATbkYYwpIFpdVdcH/Pb2ynpd6VXAgMBAAECgYAbQE+LFyhH25Iou0KCpJ0kDHhjU+UIUlrRP8kjHYQOqXzUmtr0p903OkpHNPsc8wJX1SQxGra60aXE4HVR9fYFQNliAnSmA/ztGR4ddnirK1Gzog4y2OOkicTdSqJ/1XXtTEDSRkA0Z2DIqcWgudeSDzVjUpreYwQ/rCEZbi50AQJBAJcf9wi5bU8tdZUCg3/8MNDwHhr4If4V/9kmhsgNp+M/9tHwCbD05hCbiGS7g58DPF+6V2K30qQYq7yvBP8Te4ECQQCL1GhX/YwkD6rexi0E1bjz+RqhNLTR9kexkTfSYmL6zHeeIFSH8ROioGOJMU51lUtMNkkrKEeki5SZpkfaQOzXAkAvBnJPU6vQ7HtfH8YdiDMEgQNNLxMcxmmzf4qHK8CnNRsvnnrVho8kcdFSTwsY6t/Zhdl1TXANQeQGtYtfeAeBAkEAhUB351JSWJMtrHqCsFbTmHxNKk7F+kiObeMLpUvpM0PiwifhJmNQ6Oubr0Pzlw4c4ZXiCGSsUVxK0lmpo423pQJATYDoxVhZrKA3xDAifWoyxbyxf/WXtUGDaAOuZc/naVN5TKiqaEO6G+k3NpmOXNKsYU/Zd9e6P/TnfU74TyDDDA==\n-----END RSA PRIVATE KEY-----',
                // eslint-disable-next-line max-len
                signature = 'Bi%2FocoeczWLcYlMpYtW9HdFh41YMEFXSWpdzFZkJKJ8T7rBsuYoC%2FVDeCUx52DLiHMlkrnfVwmNfnvwyUusEPIOq61Ytb0w3Oq3V2G5jE58%2BSYMmgKEZQuP6znqfadWq%2Bu8z3nv1oiN4xacJpIRtFh4M1iDz8q%2BpLvxl3of%2BtoE%3D',
                rawReq = _.merge({}, rawRequests.oauth1, {
                    auth: {
                        oauth1: {
                            signatureMethod: 'RSA-SHA1',
                            addParamsToHeader: false,
                            includeBodyHash: true,
                            privateKey: privateKey
                        }
                    },
                    body: {
                        mode: 'graphql',
                        graphql: {
                            query: 'query Test { hello }',
                            operationName: 'Test',
                            variables: '{"foo":"bar"}'
                        }
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_signature')).to.eql(signature);
        });

        it('should generate correct signature for request with disabled query params', function () {
            var rawReq = _(rawRequests.oauth1).omit(['auth.oauth1.nonce', 'auth.oauth1.timestamp']).merge({
                    url: {
                        host: ['postman-echo', 'com'],
                        path: ['auth', 'oauth1'],
                        protocol: 'https',
                        query: [
                            { key: 'param_1', value: 'value_1' },
                            { key: 'param_2', value: 'value_2', disabled: true }
                        ]
                    },
                    auth: {
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: 1461319769,
                            nonce: 'ik3oT5',
                            version: '1.0',
                            realm: '',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: false
                        }
                    }
                }).value(),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.get('oauth_signature')).to.eql('e8WDYQsG8SYPoWnxU4CYbqHT1HU%3D');
            });
        });

        it('should encode query params with RFC-3986 standards', function () {
            var rawReq = _.merge(rawRequests.oauth1, {
                    url: {
                        host: ['postman-echo', 'com'],
                        path: ['auth', 'oauth1'],
                        protocol: 'https',
                        query: [{
                            key: 'testParam',
                            value: 'this.is~a,test_value?for&RFC-3986!'
                        },
                        {
                            key: 'testParam2',
                            value: 'first,second&third'
                        },
                        {
                            key: 'testParam3',
                            value: 'first%2Csecond%26third'
                        }],
                        variable: []
                    },
                    auth: {
                        oauth1: {
                            addEmptyParamsToSign: true,
                            addParamsToHeader: false
                        }
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);
            expect(request.url.query.get('testParam')).to.eql('this.is~a%2Ctest_value%3Ffor%26RFC-3986%21');
            expect(request.url.query.get('testParam2')).to.eql('first%2Csecond%26third');
            expect(request.url.query.get('testParam3')).to.eql('first%2Csecond%26third');
        });

        it('should not remove query params when keys are empty', function () {
            var _rawReq = {
                    url: 'https://postman-echo.com/oauth1?=bar&testParam=testValue',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            timestamp: '1461319769',
                            nonce: 'ik3oT5',
                            version: '1.0',
                            verifier: '',
                            callback: 'http://postman.com',
                            addParamsToHeader: true,
                            addEmptyParamsToSign: false
                        }
                    }
                },
                request = new Request(_rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);
            expect(request.url.query.count()).to.eql(2);
        });

        it('should encode query params when the disableUrlEncoding option is false', function () {
            var _rawReq = {
                    url: 'https://postman-echo.com/oauth1?foo,+?=bar*+=&testParam/*=testValue$@',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            callback: 'http://postman.com',
                            addParamsToHeader: true,
                            addEmptyParamsToSign: false
                        }
                    }
                },
                protocolProfileBehavior = {
                    disableUrlEncoding: false
                },
                request = new Request(_rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth, {}, protocolProfileBehavior),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.count()).to.eql(2);
            expect(request.url.query.get('foo%2C%20%3F')).to.eql('bar%2A%20%3D');
            expect(request.url.query.get('testParam%2F%2A')).to.eql('testValue%24%40');
        });

        it('should not encode query params when the disableUrlEncoding option is true', function () {
            var _rawReq = {
                    url: 'https://postman-echo.com/oauth1?foo,+?=bar*+=&testParam/*=testValue$@',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            callback: 'http://postman.com',
                            addParamsToHeader: true,
                            addEmptyParamsToSign: false
                        }
                    }
                },
                protocolProfileBehavior = {
                    disableUrlEncoding: true
                },
                request = new Request(_rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth, {}, protocolProfileBehavior),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.count()).to.eql(2);
            expect(request.url.query.get('foo,+?')).to.eql('bar*+=');
            expect(request.url.query.get('testParam/*')).to.eql('testValue$@');
        });

        // This test is to make sure that in the absence of a setting, the standard is followed
        it('should encode query params when protocolProfilebehavior is not passed to authInterface', function () {
            var _rawReq = {
                    url: 'https://postman-echo.com/oauth1?foo,+?=bar*+=&testParam/*=testValue$@',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            callback: 'http://postman.com',
                            addParamsToHeader: true,
                            addEmptyParamsToSign: false
                        }
                    }
                },
                request = new Request(_rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.count()).to.eql(2);
            expect(request.url.query.get('foo%2C%20%3F')).to.eql('bar%2A%20%3D');
            expect(request.url.query.get('testParam%2F%2A')).to.eql('testValue%24%40');
        });

        // protocolProfileBehavior is a part of the OAuth1 flow now and is set externally, hence
        // this check is necessary
        it('should encode query params when protocolProfilebehavior is undefined', function () {
            var _rawReq = {
                    url: 'https://postman-echo.com/oauth1?foo,+?=bar*+=&testParam/*=testValue$@',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            callback: 'http://postman.com',
                            addParamsToHeader: true,
                            addEmptyParamsToSign: false
                        }
                    }
                },
                protocolProfileBehavior,
                request = new Request(_rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth, {}, protocolProfileBehavior),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.count()).to.eql(2);
            expect(request.url.query.get('foo%2C%20%3F')).to.eql('bar%2A%20%3D');
            expect(request.url.query.get('testParam%2F%2A')).to.eql('testValue%24%40');
        });

        it('should encode signature params in query when the disableUrlEncoding option is false', function () {
            var _rawReq = {
                    url: 'https://postman-echo.com/oauth1',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            callback: 'http://postman.com',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: false
                        }
                    }
                },
                protocolProfileBehavior = {
                    disableUrlEncoding: false
                },
                request = new Request(_rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth, {}, protocolProfileBehavior),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_callback')).to.eql('http%3A%2F%2Fpostman.com');
        });

        it('should not encode signature params in query when the disableUrlEncoding option is true', function () {
            var _rawReq = {
                    url: 'https://postman-echo.com/oauth1',
                    auth: {
                        type: 'oauth1',
                        oauth1: {
                            consumerKey: 'RKCGzna7bv9YD57c',
                            consumerSecret: 'D+EdQ-gs$-%@2Nu7',
                            token: 'foo',
                            tokenSecret: 'bar',
                            signatureMethod: 'HMAC-SHA1',
                            callback: 'http://postman.com',
                            addParamsToHeader: false,
                            addEmptyParamsToSign: false
                        }
                    }
                },
                protocolProfileBehavior = {
                    disableUrlEncoding: true
                },
                request = new Request(_rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth, {}, protocolProfileBehavior),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.url.query.get('oauth_callback')).to.eql('http://postman.com');
        });
    });

    describe('oauth2', function () {
        var requestObj = {
            auth: {
                type: 'oauth2',
                oauth2: {
                    accessToken: '123456789abcdefghi',
                    addTokenTo: 'header',
                    tokenType: 'bearer'
                }
            },
            url: 'https://api.github.com/user/orgs',
            method: 'GET'
        };

        it('should sign the request by adding the token to the header', function () {
            var request = new Request(requestObj),
                authInterface = createAuthInterface(request.auth),
                handler = AuthLoader.getHandler(request.auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should sign the request by adding the token to the query params', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.addTokenTo = 'queryParams';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            expect(request.url.query.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.url.query.toJSON()[0]).to.eql({
                key: 'access_token',
                value: requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should return when token is not present', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            delete clonedRequestObj.auth.oauth2.accessToken;

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            expect(request.url.query.all()).to.be.an('array').that.is.empty;
        });

        it('should default the token type to "Bearer"', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.tokenType = '';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should do a case insensitive check for token type', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.tokenType = 'Bearer';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });

            clonedRequestObj.auth.oauth2.tokenType = 'bearer';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should treat unknown token type as "Bearer"', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.tokenType = 'unknown type';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should use custom header prefix when provided', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = 'Postman ';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Postman ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should separate custom header prefix and token with a space', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = 'Postman';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Postman ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should trim extra spaces in custom header prefix', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = '     Postman     ';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Postman ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should add empty header prefix when headerPrefix = ""', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = '';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should add default header prefix when headerPrefix = undefined', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.headerPrefix = undefined;

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.has.lengthOf(1);
            expect(request.headers.toJSON()[0]).to.eql({
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            });
        });

        it('should return when token type is MAC', function () {
            var clonedRequestObj,
                request,
                auth,
                authInterface,
                handler;

            clonedRequestObj = _.cloneDeep(requestObj);
            clonedRequestObj.auth.oauth2.tokenType = 'mac';

            request = new Request(clonedRequestObj);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.all()).to.be.an('array').that.is.empty;
            expect(request.url.query.all()).to.be.an('array').that.is.empty;
        });

        it('should remove user defined Authorization header and query param for addTokenTo: header', function () {
            var requestWithAuthHeader,
                request,
                auth,
                authInterface,
                handler;

            requestWithAuthHeader = _.defaults({
                header: [{ key: 'Authorization', value: 'This should be removed' }],
                url: 'https://postman-echo.com/get?access_token=not-anymore'
            }, requestObj);

            request = new Request(requestWithAuthHeader);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([{
                key: 'Authorization',
                value: 'Bearer ' + requestObj.auth.oauth2.accessToken,
                system: true
            }]);

            expect(request.url.toJSON()).to.eql({
                protocol: 'https',
                path: ['get'],
                host: ['postman-echo', 'com'],
                query: [],
                variable: []
            });
        });

        it('should remove user defined Authorization header and query param for addTokenTo: queryParams', function () {
            var requestWithAuthHeader,
                request,
                auth,
                authInterface,
                handler;

            requestWithAuthHeader = _.defaults({
                auth: {
                    type: 'oauth2',
                    oauth2: {
                        accessToken: '123456789abcdefghi',
                        addTokenTo: 'queryParams',
                        tokenType: 'bearer'
                    }
                },
                header: [{ key: 'Authorization', value: 'This should be removed' }],
                url: 'https://postman-echo.com/get?access_token=not-anymore'
            }, requestObj);

            request = new Request(requestWithAuthHeader);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([]);

            expect(request.url.toJSON()).to.eql({
                protocol: 'https',
                path: ['get'],
                host: ['postman-echo', 'com'],
                query: [{ key: 'access_token', value: '123456789abcdefghi', system: true }],
                variable: []
            });
        });

        it('should not remove user config for bail out case', function () {
            var requestWithAuthHeader,
                request,
                auth,
                authInterface,
                handler;

            // no access token
            requestWithAuthHeader = _.defaults({
                auth: {
                    type: 'oauth2',
                    oauth2: {
                        addTokenTo: 'queryParams',
                        tokenType: 'bearer'
                    }
                },
                header: [{ key: 'Authorization', value: 'Old-Header' }],
                url: 'https://postman-echo.com/get?access_token=old-token'
            }, requestObj);

            request = new Request(requestWithAuthHeader);
            auth = request.auth;
            authInterface = createAuthInterface(auth);
            handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.headers.toJSON()).to.eql([{ key: 'Authorization', value: 'Old-Header' }]);

            expect(request.url.toJSON()).to.eql({
                protocol: 'https',
                path: ['get'],
                host: ['postman-echo', 'com'],
                query: [{ key: 'access_token', value: 'old-token' }],
                variable: []
            });
        });
    });

    // querystring.unescape is not available in browserify's querystring module, so this goes to hell
    // TODO: fix this
    (typeof window === 'undefined' ? describe : describe.skip)('awsv4', function () {
        it('should add the required headers', function () {
            var awsv4Data = rawRequests.awsv4,
                request = new Request(rawRequests.awsv4),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                authParams = auth.parameters().toObject(),
                handler = AuthLoader.getHandler(auth.type),
                parsedUrl,
                headers,
                expectedSignedReq;

            handler.sign(authInterface, request, _.noop);
            parsedUrl = new Url(awsv4Data.url);
            headers = request.getHeaders({
                ignoreCase: true
            });
            expectedSignedReq = aws4.sign({
                headers: {
                    'X-Amz-Date': headers['x-amz-date'],
                    'content-type': 'application/json'
                },
                host: parsedUrl.getRemote(),
                path: parsedUrl.getPathWithQuery(),
                service: authParams.serviceName,
                region: authParams.region,
                method: awsv4Data.method
            }, {
                accessKeyId: authParams.accessKey,
                secretAccessKey: authParams.secretKey,
                sessionToken: authParams.sessionToken
            });

            // Ensure that the required headers have been added.
            // todo stricter tests?

            expect(headers).to.deep.include({
                authorization: expectedSignedReq.headers.Authorization,
                'content-type': request.getHeaders({
                    ignoreCase: true
                })['content-type']
            });
            expect(headers).to.include.keys(['x-amz-date', 'x-amz-security-token']);
        });

        it('should list all modified headers in manifest', function (done) {
            var requestJSON = _.assign({}, rawRequests.awsv4, {
                    header: [],
                    body: {
                        mode: 'raw',
                        raw: 'Hello'
                    }
                }),
                request = new Request(requestJSON),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headersInManifest = _.transform(handler.manifest.updates, function (acc, entity) {
                    if (entity.type === 'header') {
                        acc.push(entity.property.toLowerCase());
                    }
                }, []),
                headers;

            handler.sign(authInterface, request, function () {
                headers = request.getHeaders({
                    ignoreCase: true
                });

                // ensure that all the headers added are listed in manifest
                expect(_.difference(Object.keys(headers), headersInManifest)).to.be.empty;

                // ensure that there are no extra headers in manifest that
                // are not added by the auth
                expect(headers).to.include.keys(headersInManifest);
                done();
            });
        });

        it('should list all modified query params in manifest', function (done) {
            var requestJSON = _.merge({}, rawRequests.awsv4, {
                    auth: {
                        awsv4: {
                            service: 's3',
                            addAuthDataToQuery: true
                        }
                    }
                }),
                request = new Request(requestJSON),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                paramsInManifest = _.transform(handler.manifest.updates, function (acc, entity) {
                    if (entity.type === 'url.param') {
                        acc.push(entity.property);
                    }
                }, []),
                params;

            handler.sign(authInterface, request, function () {
                params = request.url.query.toObject();

                // ensure that all the params added are listed in manifest
                expect(_.difference(Object.keys(params), paramsInManifest)).to.be.empty;

                // ensure that there are no extra params in manifest that
                // are not added by the auth
                expect(params).to.include.keys(paramsInManifest);
                done();
            });
        });

        it('should not modify query params when `addAuthDataToQuery: false`', function (done) {
            var requestJSON = _.merge({}, rawRequests.awsv4, {
                    auth: {
                        awsv4: {
                            service: 's3',
                            addAuthDataToQuery: false
                        }
                    }
                }),
                request = new Request(requestJSON),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.url.query.count()).to.eql(0);
                done();
            });
        });

        it('should not add auth data to headers when `addAuthDataToQuery: true`', function (done) {
            var requestJSON = _.merge({}, rawRequests.awsv4, {
                    auth: {
                        awsv4: {
                            service: 's3',
                            addAuthDataToQuery: true
                        }
                    }
                }),
                request = new Request(requestJSON),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(authInterface, request, function () {
                headers = request.getHeaders({
                    ignoreCase: true
                });

                expect(headers).to.not.include.keys([
                    'authorization',
                    'x-amz-date',
                    'X-amz-security-token',
                    'x-amz-content-sha256'
                ]);
                done();
            });
        });

        it('should use sensible defaults where applicable', function () {
            var headers,
                rawReq = _.defaults(rawRequests.awsv4, {
                    body: {
                        mode: 'raw',
                        raw: '\'foo\': \'bar\''
                    }
                }),
                request = new Request(_.omit(rawReq, ['header.0', 'auth.awsv4.sessionToken', 'region'])),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            request.headers.add({
                key: 'postman-token',
                value: 'random-token'
            });
            headers = request.getHeaders({
                ignoreCase: true
            });

            expect(headers).to.include.keys(['authorization', 'x-amz-date']);
            expect(request.auth.parameters().toObject()).to.eql({
                auto: true,
                id: 'awsSigV4',
                region: 'eu-west-1',
                saveHelper: true,
                service: '',
                serviceName: 'execute-api',
                accessKey: 'AKIAI53QRL',
                secretKey: 'cr2RAfsY4IIVweutTBoBzR',
                time: 1452673288848
            });
        });

        it('should handle formdata bodies correctly', function () {
            var rawReq = _.merge({}, rawRequests.awsv4, {
                    body: {
                        mode: 'formdata',
                        formdata: []
                    }
                }),
                request = new Request(_.omit(rawReq, 'header')),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(authInterface, request, _.noop);
            headers = request.getHeaders({
                ignoreCase: true
            });

            expect(headers).to.include.keys(['authorization', 'x-amz-date']);
            expect(request.auth.parameters().toObject()).to.eql({
                auto: true,
                id: 'awsSigV4',
                region: 'eu-west-1',
                saveHelper: true,
                service: '',
                serviceName: 'execute-api',
                accessKey: 'AKIAI53QRL',
                sessionToken: '33Dhtnwf0RVHCFttmMPYt3dxx9zi8I07CBwTXaqupHQ=',
                secretKey: 'cr2RAfsY4IIVweutTBoBzR',
                time: 1452673288848
            });
        });

        it('should handle graphql bodies correctly', function (done) {
            var rawReq = _.merge({}, rawRequests.awsv4, {
                    body: {
                        mode: 'graphql',
                        graphql: {
                            query: 'query Test { hello }',
                            operationName: 'Test',
                            variables: '{"foo":"bar"}'
                        }
                    }
                }),
                request = new Request(_.omit(rawReq, 'header')),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(authInterface, request, function () {
                headers = request.getHeaders({
                    ignoreCase: true
                });

                expect(headers).to.include.keys(['authorization', 'x-amz-date']);
                expect(request.auth.parameters().toObject()).to.eql({
                    auto: true,
                    id: 'awsSigV4',
                    region: 'eu-west-1',
                    saveHelper: true,
                    service: '',
                    serviceName: 'execute-api',
                    accessKey: 'AKIAI53QRL',
                    sessionToken: '33Dhtnwf0RVHCFttmMPYt3dxx9zi8I07CBwTXaqupHQ=',
                    secretKey: 'cr2RAfsY4IIVweutTBoBzR',
                    time: 1452673288848
                });
                done();
            });
        });
    });

    describe('hawk', function () {
        it('should add the Auth header', function () {
            var request = new Request(rawRequests.hawk),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers;

            handler.sign(authInterface, request, _.noop);
            headers = request.getHeaders({
                ignoreCase: true
            });

            // Ensure that the required headers have been added.
            expect(headers).to.have.property('authorization');
        });

        it('should add the timestamp and nonce to the Authorized request', function () {
            var request = new Request(rawRequests.hawk),
                clonedRequest = new Request(request.toJSON()), // cloning it so we can assert comparing the two
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headerBefore,
                headerAfter,
                nonceMatch,
                tsMatch;

            handler.sign(authInterface, clonedRequest, _.noop);

            headerBefore = request.headers.all()[0].value;
            headerAfter = clonedRequest.headers.all()[0].value;
            nonceMatch = headerAfter.match(/nonce="([^"]*)"/);
            tsMatch = headerAfter.match(/ts="([^"]*)"/);

            // Original request should not have the timestamp and nonce
            expect(headerBefore).to.be.eql('');

            expect(request.auth).to.be.ok;
            expect(_.get(nonceMatch, 1)).to.be.a('string');
            expect(_.parseInt(_.get(tsMatch, 1))).to.be.a('number');
        });

        it('should add the hash to the Authorized request if request contains body and includePayloadHash=true',
            function () {
                var request = new Request(rawRequests.hawkWithBody),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers;

                handler.sign(authInterface, request, _.noop);
                headers = request.getHeaders({
                    ignoreCase: true
                });

                // Ensure that the required headers have been added.
                expect(headers).to.have.property('authorization');

                // Ensure that the body hash is included in Authorization header
                expect(headers.authorization).to.include('hash');
            });

        it('should not add the hash to the Authorized request if request contains body but includePayloadHash=false',
            function () {
                var request = new Request(rawRequests.hawkWithBodyWithoutHash),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers;

                handler.sign(authInterface, request, _.noop);
                headers = request.getHeaders({
                    ignoreCase: true
                });

                // Ensure that the required headers have been added.
                expect(headers).to.have.property('authorization');

                // Ensure that the body hash is included in Authorization header
                expect(headers.authorization).to.not.include('hash');
            });

        it('should bail out the original request if auth key is missing', function () {
            var request = new Request(_.omit(rawRequests.hawk, 'auth.hawk.authKey')),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            // Original request should not have the timestamp and nonce
            expect(_.get(rawRequests.hawk, 'auth.hawk.nonce')).to.not.be.ok;
            expect(_.get(rawRequests.hawk, 'auth.hawk.timestamp')).to.not.be.ok;

            expect(request.auth).to.be.ok;
            expect(_.get(request, 'auth.hawk.nonce')).to.not.be.ok;
            expect(_.get(request, 'auth.hawk.timestamp')).to.not.be.ok;
        });

        it('should handle formdata bodies correctly when includePayloadHash=true',
            function (done) {
                var rawReq = _.merge({}, rawRequests.hawkWithBody, {
                        body: {
                            mode: 'formdata',
                            formdata: []
                        }
                    }),
                    request = new Request(rawReq),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers;

                handler.sign(authInterface, request, function () {
                    headers = request.getHeaders({
                        ignoreCase: true
                    });

                    // Ensure that the required headers have been added.
                    expect(headers).to.have.property('authorization');

                    // Ensure that the body hash is not included in Authorization header.
                    // Update this once we figure out a way to calculate hash for formdata body type.
                    expect(headers.authorization).to.not.include('hash');

                    done();
                });
            });

        it('should handle graphql bodies correctly when includePayloadHash=true',
            function (done) {
                var rawReq = _.merge({}, rawRequests.hawkWithBody, {
                        body: {
                            mode: 'graphql',
                            graphql: {
                                query: 'query Test { hello }',
                                operationName: 'Test',
                                variables: '{"foo":"bar"}'
                            }
                        }
                    }),
                    request = new Request(rawReq),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers;

                handler.sign(authInterface, request, function () {
                    headers = request.getHeaders({
                        ignoreCase: true
                    });

                    // Ensure that the required headers have been added.
                    expect(headers).to.have.property('authorization');

                    // Ensure that the body hash is included in Authorization header
                    expect(headers.authorization).to.include('hash');

                    done();
                });
            });
    });

    describe('ntlm', function () {
        it('should be able to load all parameters from a request', function () {
            var data = {
                    auth: {
                        type: 'ntlm',
                        ntlm: {
                            username: 'testuser',
                            password: 'testpass',
                            domain: 'testdomain',
                            workstation: 'sample.work'
                        }
                    },
                    url: 'postman-echo.com/get'
                },
                request = new Request(data),
                auth = request.auth,
                authInterface = createAuthInterface(auth, {}),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, _.noop);

            expect(request.auth.ntlm.toObject()).to.eql({
                username: 'testuser',
                password: 'testpass',
                domain: 'testdomain',
                workstation: 'sample.work'
            });
        });
    });

    describe('EdgeGrid', function () {
        var requestWithAllParams = {
                auth: {
                    type: 'edgegrid',
                    edgegrid: {
                        accessToken: 'postman_access_token',
                        clientToken: 'postman_client_token',
                        clientSecret: 'postman_client_secret',
                        baseURL: 'https://postman-echo.com',
                        nonce: 'foo',
                        timestamp: '20191009T06:38:34+0000',
                        headersToSign: ''
                    }
                },
                url: 'https://postman-echo.com/get',
                method: 'GET',
                header: [
                    {
                        key: 'Authorization',
                        value: '',
                        description: ''
                    }
                ]
            },

            requestWithoutOptionalParams = {
                auth: {
                    type: 'edgegrid',
                    edgegrid: {
                        accessToken: 'postman_access_token',
                        clientToken: 'postman_client_token',
                        clientSecret: 'postman_client_secret'
                    }
                },
                url: 'https://postman-echo.com/get',
                method: 'GET',
                header: [
                    {
                        key: 'Authorization',
                        value: '',
                        description: ''
                    }
                ]
            };

        it('should be able to load all parameters from a request', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                expect(request.auth.edgegrid.toObject()).to.include({
                    accessToken: 'postman_access_token',
                    clientToken: 'postman_client_token',
                    clientSecret: 'postman_client_secret',
                    baseURL: 'https://postman-echo.com',
                    nonce: 'foo',
                    timestamp: '20191009T06:38:34+0000',
                    headersToSign: ''
                });
                done();
            });
        });

        it('should add Authorization header with required values', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0];

                expect(authHeader.system).to.be.true;

                authHeader = authHeader.toString();
                expect(authHeader).to.include('client_token=postman_client_token');
                expect(authHeader).to.include('access_token=postman_access_token');
                expect(authHeader).to.include('timestamp=20191009T06:38:34+0000');
                expect(authHeader).to.include('nonce=foo');
                expect(authHeader).to.include('signature=');
                done();
            });
        });

        it('should add auto-generated nonce to Authorization header when not provided', function (done) {
            var rawReq = requestWithoutOptionalParams,
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.match(/nonce=([A-Z]|[a-z]|[0-9]|-){36};/);
                done();
            });
        });

        it('should add auto-generated timestamp to Authorization header when not provided', function (done) {
            var rawReq = requestWithoutOptionalParams,
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type);

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.match(/timestamp=[0-9]{8}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+0000;/);
                done();
            });
        });

        it('should calculate correct signature for request without body', function (done) {
            var rawReq = requestWithAllParams,
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = 'UAU6Kp19TTPX+U0iwL02ILJgwHNN4Uo1vyYYKWileLM=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });

        it('should calculate correct signature for non-POST request with body', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'PUT',
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = 'qtdfIJzsauPvytI9WdIQoPKH15jGjIgWZyJ37yuzrbM=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });

        it('should calculate correct signature for POST request with raw body', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'raw',
                        raw: 'Hello World!!'
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = '/206+PqfPKDQ4ljGCU3Jq9kj1D+XrycugYy8GmyVKzg=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });

        it('should calculate correct signature for POST request with urlencoded body', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'urlencoded',
                        urlencoded: [{
                            key: 'foo',
                            value: 'bar'
                        }]
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = 'CX6gvvw5aaNv0qa9M6Kn2e/+swM914PxBv6wU6jHa84=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });

        it('should calculate correct signature for POST request with GraphQL body', function (done) {
            var rawReq = _.merge({}, requestWithAllParams, {
                    method: 'POST',
                    body: {
                        mode: 'graphql',
                        graphql: {
                            query: 'query Test { hello }',
                            operationName: 'Test',
                            variables: '{"foo":"bar"}'
                        }
                    }
                }),
                request = new Request(rawReq),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                expectedSignature = 'gyJTYlDGTNOGYsOyTvPIWKsEtWBfuILnmMhIIYMcSoU=';

            handler.sign(authInterface, request, function () {
                var headers = request.headers.all(),
                    authHeader;

                expect(headers).to.have.lengthOf(1);

                authHeader = headers[0].toString();

                expect(authHeader).to.include(`signature=${expectedSignature}`);
                done();
            });
        });
    });

    describe('asap', function () {
        compulsoryParams.forEach((param) => {
            it(`should NOT add the Auth header if ${param} is missing`, async function () {
                var request = new Request({
                        auth: {
                            type: 'asap',
                            asap: {
                                alg: param === 'RS256',
                                kid: param === 'kid' ? '' : 'test-kid',
                                iss: param === 'iss' ? '' : 'postman.com',
                                exp: '',
                                aud: param === 'aud' ? '' : 'test-audience',
                                jti: '',
                                privateKey: param === 'privateKey' ? '' : privateKeyMap.privatekeyRSA
                            }
                        },
                        url: 'https://postman-echo.com/get',
                        method: 'GET',
                        header: [],
                        data: {
                            mode: 'formdata',
                            content: []
                        },
                        description: ''
                    }),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers,
                    authHandlerSignPromiseObject = {};

                authHandlerSignPromiseObject.promise = new Promise((resolve, reject) => {
                    authHandlerSignPromiseObject.resolve = resolve;
                    authHandlerSignPromiseObject.reject = reject;
                });

                handler.sign(authInterface, request, authHandlerSignPromiseObject.resolve);

                // Wait for the handler to sign this request
                await authHandlerSignPromiseObject.promise;

                headers = request.getHeaders({
                    ignoreCase: true
                });

                // Ensure that the required headers have been added.
                expect(headers).to.not.have.property('authorization');
            });
        });

        algorithms.forEach(([key]) => {
            var alg = algorithmsSupported[key].alg,
                signKey = algorithmsSupported[key].signKey();

            it(`should add the Auth header for ${alg} algorithm`, async function () {
                var request = new Request(getAsapRequestsForAlg(alg, signKey)),
                    auth = request.auth,
                    authInterface = createAuthInterface(auth),
                    handler = AuthLoader.getHandler(auth.type),
                    headers,
                    authHandlerSignPromiseObject = {};

                authHandlerSignPromiseObject.promise = new Promise((resolve, reject) => {
                    authHandlerSignPromiseObject.resolve = resolve;
                    authHandlerSignPromiseObject.reject = reject;
                });

                handler.sign(authInterface, request, authHandlerSignPromiseObject.resolve);

                // Wait for the handler to sign this request
                await authHandlerSignPromiseObject.promise;

                headers = request.getHeaders({
                    ignoreCase: true
                });

                // Ensure that the required headers have been added.
                expect(headers).to.have.property('authorization');
            });
        });

        it('should NOT add authorization header with invalid base64 DER key', async function () {
            var request = new Request({
                    auth: {
                        type: 'asap',
                        asap: {
                            alg: 'RS256',
                            kid: 'test-kid',
                            iss: 'postman.com',
                            exp: '',
                            aud: 'test-audience',
                            jti: '',
                            privateKey: getRSADerKeyForKeyId('test-kid', RSA_BASE64_DER_INVALID)
                        }
                    },
                    url: 'https://postman-echo.com/get',
                    method: 'GET',
                    header: [],
                    data: {
                        mode: 'formdata',
                        content: []
                    },
                    description: ''
                }),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHandlerSignPromiseObject = {};

            authHandlerSignPromiseObject.promise = new Promise((resolve, reject) => {
                authHandlerSignPromiseObject.resolve = resolve;
                authHandlerSignPromiseObject.reject = reject;
            });

            handler.sign(authInterface, request, authHandlerSignPromiseObject.resolve);

            // Wait for the handler to sign this request
            await authHandlerSignPromiseObject.promise;

            headers = request.getHeaders({
                ignoreCase: true
            });

            // Ensure that the required headers have been added.
            expect(headers).to.not.have.property('authorization');
        });

        it('should add authorization header with valid base64 DER key', async function () {
            var request = new Request({
                    auth: {
                        type: 'asap',
                        asap: {
                            alg: 'RS256',
                            kid: 'test-kid',
                            iss: 'postman.com',
                            exp: '',
                            aud: 'test-audience',
                            jti: '',
                            privateKey: getRSADerKeyForKeyId('test-kid', RSA_BASE64_DER)
                        }
                    },
                    url: 'https://postman-echo.com/get',
                    method: 'GET',
                    header: [],
                    data: {
                        mode: 'formdata',
                        content: []
                    },
                    description: ''
                }),
                auth = request.auth,
                authInterface = createAuthInterface(auth),
                handler = AuthLoader.getHandler(auth.type),
                headers,
                authHandlerSignPromiseObject = {};

            authHandlerSignPromiseObject.promise = new Promise((resolve, reject) => {
                authHandlerSignPromiseObject.resolve = resolve;
                authHandlerSignPromiseObject.reject = reject;
            });

            handler.sign(authInterface, request, authHandlerSignPromiseObject.resolve);

            // Wait for the handler to sign this request
            await authHandlerSignPromiseObject.promise;

            headers = request.getHeaders({
                ignoreCase: true
            });

            // Ensure that the required headers have been added.
            expect(headers).to.have.property('authorization');
        });
    });
});
