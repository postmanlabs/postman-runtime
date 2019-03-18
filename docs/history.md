# History

As the name suggests, the history object in `request` and `response` [callbacks](https://github.com/postmanlabs/postman-runtime/#callbacks) holds the entire life-cycle of a request sent and the response received as well as low-level execution information which helps to debug the request execution.

### Structure

The structure of the history object in its full shape looks like this:

**execution**: `Object` - The execution history of a request
  **verbose**: `Boolean` - Is verbose level information available or not
  **data**: `Array` - The execution data/logs of every request sent (including redirects)
  - request: `Object` - The first request sent in a redirect chain (initial request)
      method: `String` - Request method
      href: `String` - Request URL
      proxy: `Object` - Request Proxy details
        href: `String` - Proxy URL
      httpVersion: `String` - Request HTTP Version
    response: `Object` - The response of the first request
      statusCode: `Number` - Response status code
      httpVersion: `String` - Response HTTP Version
    session: `Object` - Session used in request (referred in `sessions`)
      id: `String` - Unique session ID
      reused: `Boolean` - Is session reused (Keep-Alive connection)
    timings: `Object` - Request-Response events timeline
      start: `Number` - Timestamp of the start of the request (in Runtime)
      requestStart: `Number` - Timestamp of the start of the request (in Postman Request)
      offset: `Object` - Events offsets in millisecond resolution relative to `start`
        request: `Number` - Timestamp of the start of the request
        socket: `Number` - Timestamp when the socket is assigned to the request
        lookup: `Number` - Timestamp when the DNS has been resolved
        connect: `Number` - Timestamp when the server acknowledges the TCP connection
        secureConnect: `Number` - Timestamp when secure handshaking process is completed
        response: `Number` - Timestamp when the first bytes are received from the server
        end: `Number` - Timestamp when the last bytes of the response is received
        done: `Number` - Timestamp when the response is received at the client (Runtime)
  - request: `Object` - The final request sent (redirect request)
      > // Same as above
  **sessions**: `Object` - Different socket connections made during the request
    <UNIQUE-SESSION-ID>: `Object` - Connection session data
      addresses: `Object` - Local and remote address data
        local: `Object` - Local address data
          address: `String` - Local IP address
          family: `String` - Local IP family, `IPv4/IPv6`
          port: `Number` - Local port
        remote: `Object` - Remote address data
          address: `String` - Remote IP address
          family: `String` - Remote IP family, `IPv4/IPv6`
          port: `Number` - Remote port
      tls: `Object` - TLS related information
        reused: `Boolean` - Is this TLS session reused
        authorized: `Boolean` - Is `peerCertificate` was signed by one of the trusted CAs
        authorizationError: `String` - Reason why the `peerCertificate` was not been verified
        cipher: `Object` - TLS cipher information
          name: `String` - Cipher name
          version: `String` - Cipher version
        protocol: `String` - The negotiated SSL/TLS protocol version
        ephemeralKeyInfo: `Object` - Ephemeral key exchange data
          type: `String` - The type of ephemeral key exchange
          name: `String` - The ephemeral key name
          size: `Number` - The size of ephemeral key
        peerCertificate: `Object` - The peer's certificate data
          subject: `Object` - The certificate subject
            country: `String`
            stateOrProvince: `String`
            locality: `String`
            organization: `String`
            organizationalUnit: `String`
            commonName: `String`
            alternativeNames: `String`
          issuer: `Object` - The certificate issuer
            country: `String`
            stateOrProvince: `String`
            locality: `String`
            organization: `String`
            organizationalUnit: `String`
            commonName: `String`
          validFrom: `String` - The date-time the certificate is valid from
          validTo: `String` - The date-time the certificate is valid to
          fingerprint:  `String` - The SHA-1 digest of the DER encoded certificate
          serialNumber: `String` - The certificate serial number, as a hex string

### Usage and Verbose Mode

Getting this level of debug data for every request sent in runtime might be expensive so the `sessions` details are not enabled by default and this behavior can be changed using the requester [option](https://github.com/postmanlabs/postman-runtime/#options) `verbose`.

#### Usage

The history object is accessible in both `request` and `response` callbacks.

```javascript
runner.run(collection, { requester: { verbose: true } }, function(err, run) {
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

#### Example with `verbose: false` (default)

> History for a request made at https://getpostman.com
```javascript
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

#### Example with `verbose: true`

> History for an request made at https://www.getpostman.com
```javascript
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
