## Table of contents

1. [Introduction](#history)
2. [Structure](#structure)
    1. [Structure of the properties](#structure-of-the-properties)
        1. [sessions and its use cases](#sessions)
        2. [data and its use cases](#data)
3. [Usage](#usage-and-verbose-mode)

# History

As the name suggests, the history object holds the entire life-cycle of the request sent and the response received as well as the low-level execution information which helps to debug the request execution.

## Structure

The history object has the following top-level properties:

```javascript
{
  "execution": {
    /*
    * Following properties are not available since they are passed via arguments
    * in request and response callback but eventually the history object will
    * include these as well:
    *
    * "request": <PostmanRequest>,
    * "response": <PostmanResponse>,
    * "cookies": <Object>
    */
    "verbose": true
    "sessions": { .. }
    "data": [ .. ]
  }
}
```

<details><summary>Changelog</summary>

| Version | Changes           |
|---------|-------------------|
| v7.11.0 | Added in: v7.11.0 |
</details>

- **execution** `<Object>`
    - **verbose** `<Boolean>` Flag indicating whether the low-level information is available or not.
    - **sessions** `<Object>` Holds low-level information of every socket connections made during the request.
    - **data** `<Array>` Request execution information for every request sent (including redirects).

> Each request sent by runtime have its own unique history. In the above documentation, every socket and every request sent means the redirection the initial request went through.

### Structure of the properties

#### sessions

> These details are not enabled by default. Enable `verbose` requester option to get this information.

- **sessions** `<Object>`
    - *<UNIQUE-SESSION-ID>* `<String>` Every socket have a unique session ID which will be referred in the request `data`. The same socket can be reused for a [persistent connection](https://en.wikipedia.org/wiki/HTTP_persistent_connection).
        - **addresses** `<Object>` Local and remote address information like IP, Port.
            - **local** `<Object>` Local address data.
                - *address* `<String>` Local IP address. For example, `192.168.1.1`.
                - *family* `<String>` Local IP family, `IPv4` or `IPv6`.
                - *port* `<Number>` Local port. For example, `8080`.
            - **remote** `<Object>` Remote address data
                - *address* `<String>` Remote IP address.
                - *family* `<String>` Remote IP family.
                - *port* `<Number>` Remote port.
        - **tls** `<Object>` SSL/TLS related information.
            - **reused** `<Boolean>` Flag indicating whether the TLS session reused.
            - **authorized** `<Boolean>` Flag indicating whether the `peerCertificate` was signed by one of the trusted CAs.
            - **authorizationError** `<String>` Reason why the `peerCertificate` was not been verified.
            - **cipher** `<Object>` TLS cipher information.
                - *name* `<String>` Cipher name. For example `AES256-SHA`.
                - *version* `<String>` Cipher version.
            - **protocol** `<String>` The negotiated SSL/TLS protocol version of the current connection.
            - **ephemeralKeyInfo** `<Object>` Represents the type, name, and size of the parameter of an ephemeral key exchange in [Perfect Forward Secrecy](https://en.wikipedia.org/wiki/Forward_secrecy) on a client connection.  It returns an empty object when the key exchange is not ephemeral.
                - *type*: `<String>` The type of ephemeral key exchange.
                - *name*: `<String>` The ephemeral key name.
                - *size*: `<Number>` The size of ephemeral key.
            - **peerCertificate** `<Object>` The peer's certificate information.
                - **subject**: `<Object>` The certificate subject data.
                    - *country* `<String>`
                    - *stateOrProvince* `<String>`
                    - *locality* `<String>`
                    - *organization* `<String>`
                    - *organizationalUnit* `<String>`
                    - *commonName* `<String>`
                    - *alternativeNames* `<String>`
                - **issuer**: `<Object>` The certificate issuer data.
                    - *country* `<String>`
                    - *stateOrProvince* `<String>`
                    - *locality* `<String>`
                    - *organization* `<String>`
                    - *organizationalUnit* `<String>`
                    - *commonName* `<String>`
                - **validFrom** `<String>` The date-time the certificate is valid from.
                - **validTo** `<String>` The date-time the certificate is valid to.
                - **fingerprint** `<String>` The SHA-1 digest of the DER encoded certificate. It is returned as a : separated hexadecimal string.
                - **serialNumber** `<String>` The certificate serial number, as a hex string. For example, `B9B0D332A1AA5635`.

**Use cases**:
- The remote IP address of the request. Using `addresses.remote`.
- The reason why the peer's certificate was not been verified. Using `tls.authorizationError`.
- The negotiated TLS cipher of the connection. Using `tls.cipher.name`.
- The negotiated TLS protocol version of the connection. Using `tls.protocol`.
- The peer's certificate information. Using `peerCertificate`.
- The peer's certificate validity. Using `peerCertificate.validFrom` and `peerCertificate.validTo`.

#### data

> This is an array because it holds information of every request sent in a redirect chain.

- **data** `<Array>` The execution data/logs of every request sent (including redirects).
    - **request** `<Object>` The information of the request sent.
        - *method* `<String>` Request method. For example, `GET`, `POST`.
        - *href* `<String>` Request URL.
        - *proxy* `<Object>` Request Proxy details if enabled.
            - *href* `<String>` Proxy URL.
        - *httpVersion* `<String>` Request HTTP Version. For example, `1.1`
    - **response** `<Object>` The response of the request.
      - *statusCode* `<Number>` Response status code.
      - *httpVersion* `<String>` Response HTTP Version.
    - **session** `<Object>` Session used by this request connection (referred in `sessions`).
      - *id* `<String>` Unique session ID (UUID).
      - *reused* `<Boolean>` Is session reused (persistent connection connection).
    - **timings** `<Object>` Request-Response events timeline.
      - *start* `<Number>` Timestamp of the start of the request (in Runtime).
      - *requestStart* `<Number>` Timestamp of the start of the request (in Postman Request).
      - *offset* `<Object>` Events offsets in millisecond resolution relative to `start`.
        - *request* `<Number>` Timestamp of the start of the request.
        - *socket* `<Number>` Timestamp when the socket is assigned to the request.
        - *lookup* `<Number>` Timestamp when the DNS has been resolved.
        - *connect* `<Number>` Timestamp when the server acknowledges the TCP connection.
        - *secureConnect* `<Number>` Timestamp when secure handshaking process is completed.
        - *response* `<Number>` Timestamp when the first bytes are received from the server.
        - *end* `<Number>` Timestamp when the last bytes of the response is received.
        - *done* `<Number>` Timestamp when the response is received at the client (Runtime).

**Use cases**:
- The total number of redirects a request went through and detailed information about every request. Using `data[..]`.
- The connection session information. Using `session`.
- The total response time. Using `timings.offset.end`.
- Calculating the request timing phases.
<details><summary>Example of timing phases</summary>
<p>

**Usage**:
```javascript
var Response = require('postman-collection').Response,
    executionData = history.execution.data[0];

Response.timingPhases(executionData.timings);
```

**Timing Phases**:
```javascript
{
    prepare: Number,         // duration of request preparation
    wait: Number,            // duration of socket initialization
    dns: Number,             // duration of DNS lookup
    tcp: Number,             // duration of TCP connection
    secureHandshake: Number, // duration of secure handshake
    firstByte: Number,       // duration of HTTP server response
    download: Number,        // duration of HTTP download
    process: Number,         // duration of response processing
    total: Number            // duration entire HTTP round-trip
}
```
</p>
</details>

### Usage and Verbose Mode

Getting this level of debug data for every request sent in runtime might be expensive so the `sessions` details are not enabled by default and this behavior can be changed using the requester [option](https://github.com/postmanlabs/postman-runtime/#options) `verbose`.

The history object is accessible in both `request` and `response` [callbacks](https://github.com/postmanlabs/postman-runtime/#callbacks).

```javascript
runner.run(collection, {
    requester: {
        verbose: true // default: false
    }
}, function (err, run) {
    run.start({
        // Called just after sending a request, may include request replays
        request: function (err, cursor, response, request, item, cookies, history) {

        },

        // Called once with response for each request in a collection
        response: function (err, cursor, response, request, item, cookies, history) {

        }
    })
});
```

<details><summary>Example with `verbose: false` (default)</summary>
<p>

```javascript
// History for a request made at https://getpostman.com

{
  "execution": {
    "verbose": false,
    "data": [
      {
        "request": {
          "method": "GET",
          "href": "https://getpostman.com/",
          "httpVersion": "1.1"
        },
        "response": {
          "statusCode": 301,
          "httpVersion": "1.1"
        },
        "timings": {
          "start": 1552926961425,
          "requestStart": 1552926961471,
          "offset": {
            "request": 45.888378999999986,
            "socket": 53.386758999999984,
            "lookup": 83.14568000000008,
            "connect": 307.48709400000007,
            "secureConnect": 764.0249290000002,
            "response": 1074.4071250000002,
            "end": 1080.177714,
            "done": 1945.8932490000002
          }
        }
      },
      {
        "request": {
          "method": "GET",
          "href": "https://www.getpostman.com/",
          "httpVersion": "1.1"
        },
        "response": {
          "statusCode": 200,
          "httpVersion": "1.1"
        },
        "timings": {
          "start": 1552926961425,
          "requestStart": 1552926962507,
          "offset": {
            "request": 1081.5938489999999,
            "socket": 1083.8545450000001,
            "lookup": 1105.6880500000002,
            "connect": 1220.856875,
            "secureConnect": 1811.9732119999999,
            "response": 1935.2714970000002,
            "end": 1940.5843479999999,
            "done": 1945.962564
          }
        }
      }
    ]
  }
}
```
</p>
</details>

<details><summary>Example with `verbose: true`</summary>
<p>

```javascript
// History for a request made at https://www.getpostman.com

{
  "execution": {
    "verbose": true,
    "sessions": {
      "306b0a7e-5962-4315-85b8-f86f2ee43079": {
        "addresses": {
          "local": {
            "address": "192.168.0.1",
            "family": "IPv4",
            "port": 65411
          },
          "remote": {
            "address": "54.192.216.79",
            "family": "IPv4",
            "port": 443
          }
        },
        "tls": {
          "reused": false,
          "authorized": true,
          "authorizationError": null,
          "cipher": {
            "name": "ECDHE-RSA-AES128-GCM-SHA256",
            "version": "TLSv1/SSLv3"
          },
          "protocol": "TLSv1.2",
          "ephemeralKeyInfo": {
            "type": "ECDH",
            "name": "prime256v1",
            "size": 256
          },
          "peerCertificate": {
            "subject": {
              "commonName": "*.postman.co",
              "alternativeNames": "DNS:*.postman.co, DNS:*.getpostman.com, DNS:postman.co, DNS:getpostman.com"
            },
            "issuer": {
              "country": "US",
              "organization": "Amazon",
              "organizationalUnit": "Server CA 1B",
              "commonName": "Amazon"
            },
            "validFrom": "2019-02-26T00:00:00.000Z",
            "validTo": "2020-03-26T12:00:00.000Z",
            "fingerprint": "A1:64:B8:9E:7B:C4:16:44:44:7F:FD:59:58:20:C7:54:0A:29:35:23",
            "serialNumber": "06DDCE4821DC9169CE927A9DFFE8D037"
          }
        }
      }
    },
    "data": [
      {
        "request": {
          "method": "GET",
          "href": "https://www.getpostman.com/",
          "httpVersion": "1.1"
        },
        "response": {
          "statusCode": 200,
          "httpVersion": "1.1"
        },
        "timings": {
          "start": 1552927008827,
          "requestStart": 1552927008874,
          "offset": {
            "request": 46.947711000000254,
            "socket": 54.140085,
            "lookup": 54.46655400000009,
            "connect": 171.43801800000028,
            "secureConnect": 430.9515040000001,
            "response": 550.5739940000003,
            "end": 554.7618190000003,
            "done": 562.3317340000003
          }
        },
        "session": {
          "id": "306b0a7e-5962-4315-85b8-f86f2ee43079",
          "reused": false
        }
      }
    ]
  }
}
```
</p>
</details>
