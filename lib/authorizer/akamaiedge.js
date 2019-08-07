var CryptoJS = require('crypto-js');

function convertToMinimunDigits(num, length) {
  num = num.toString();
  var pre = "";
  if (num.length < length) {
    var difference = length - num.length;
    for (var i = 0; i < difference; i++) {
      pre += "0";
    }
  }
  return pre + num;
}

// Generating GUID
var guid = (function() {
  function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
  return function() { return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4(); };
})();

// Generate Akamai signature Data
function generateSignatureData(ReqType, BaseURL, ReqPath, Data, ClientToken, AccessToken, TimeStamp, Nonce) {
  var SignatureData = ReqType + String.fromCharCode(9);
  SignatureData += "https" + String.fromCharCode(9);
  SignatureData +=  BaseURL + String.fromCharCode(9);
  SignatureData +=  ReqPath +  String.fromCharCode(9) + String.fromCharCode(9);
  SignatureData += ( ReqType == "POST" || ReqType == "PUT" ) ? 
    CryptoJS.SHA256(Data).toString(CryptoJS.enc.Base64) + String.fromCharCode(9)
    : String.fromCharCode(9);
  SignatureData += "EG1-HMAC-SHA256 "
  SignatureData += "client_token=" + ClientToken + ";"
  SignatureData += "access_token=" + AccessToken + ";"
  SignatureData += "timestamp=" + TimeStamp  + ";"
  SignatureData += "nonce=" + Nonce + ";"

  return SignatureData;
}

// Generate Authorization Header - Result of this function have to set into request header
function generateAuthorizationHeader(ClientToken, AccessToken, TimeStamp, Nonce, Signature) {
  var AuthorizationHeader = "EG1-HMAC-SHA256 "
  AuthorizationHeader += "client_token=" + ClientToken + ";"
  AuthorizationHeader += "access_token=" + AccessToken + ";"
  AuthorizationHeader += "timestamp=" + TimeStamp + ";"
  AuthorizationHeader += "nonce=" + Nonce + ";"
  AuthorizationHeader += "signature=" + Signature

  return AuthorizationHeader;
}

// Generate Hash - Using sandbox CryptoJS library
function generateHash(key,data) {
  var signature = CryptoJS.HmacSHA256(data, key);
  return signature.toString(CryptoJS.enc.Base64);
}


/**
 * @implements {AuthHandlerInterface}
 */
module.exports = {
    /**
     * @property {AuthHandlerInterface~AuthManifest}
     * @todo runtime needs to make sure AuthHandler
     * cannot mutate any property on Request that it has not declared on the manifest.
     */
    manifest: {
        info: {
            name: 'akamaiedge',
            version: '1.0.0'
        },
        updates: []
    },

    /**
     * Initializes an item (extracts parameters from intermediate requests if any, etc)
     * before the actual authorization step.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authInitHookCallback} done
     */
    init: function (auth, response, done) {
        done(null);
    },

    /**
     * Checks whether the given item has all the required parameters in its request.
     * Sanitizes the auth parameters if needed.
     *
     * @param {AuthInterface} auth
     * @param {AuthHandlerInterface~authPreHookCallback} done
     */
    pre: function (auth, done) {
        done(null, true);
    },

    /**
     * Verifies whether the request was successfully authorized after being sent.
     *
     * @param {AuthInterface} auth
     * @param {Response} response
     * @param {AuthHandlerInterface~authPostHookCallback} done
     */
    post: function (auth, response, done) {
        done(null, true);
    },

    /**
     * Signs a request.
     *
     * @param {AuthInterface} auth
     * @param {Request} request
     * @param {AuthHandlerInterface~authSignHookCallback} done
     */
    sign: function (auth, request, done) {
        var requestUrl = request.url.toString();

        // Pick up environment variables into credentials object
        var credentials = {
            baseURL: request.headers.get("baseURL"),
            accessToken: request.headers.get("accessToken"),
            clientToken: request.headers.get("clientToken"),
            clientSecret: request.headers.get("clientSecret")
        }

        // Define variables for calling Akamai API
        var endpoint = {
            method: request.method,
            host: credentials.baseURL,
            scheme: requestUrl.substring(0, requestUrl.indexOf("://")-1),
            reqPath: requestUrl.substring(requestUrl.indexOf(credentials.baseURL) + credentials.baseURL.length, requestUrl.length)
        }

        var d = new Date();
        var minimunDigits = 2;
        var TimeStamp = d.getUTCFullYear() + convertToMinimunDigits(d.getUTCMonth() + 1, minimunDigits) + convertToMinimunDigits(d.getUTCDate(), minimunDigits) + "T" + convertToMinimunDigits(d.getUTCHours(), minimunDigits) + ":" + convertToMinimunDigits(d.getUTCMinutes(), minimunDigits) + ":" + convertToMinimunDigits(d.getUTCSeconds(), minimunDigits) + "+0000";
        var Nonce = guid();
        var SignatureData = generateSignatureData(endpoint.method, credentials.baseURL, endpoint.reqPath, request.data, credentials.clientToken, credentials.accessToken, TimeStamp, Nonce);
        var SigningKey = generateHash(credentials.clientSecret, TimeStamp);
        var Signature = generateHash(SigningKey, SignatureData);
        var AuthorizationHeader = generateAuthorizationHeader(credentials.clientToken, credentials.accessToken, TimeStamp, Nonce, Signature);

        // Add created authorization header as a Header of postman collecitons
        request.addHeader({
            key: 'Authorization',
            value: AuthorizationHeader
        });

        return done();
    }
};
