# Protocol Profile Behavior

Set of configurations used to alter the usual behavior of sending the request. These can be defined in a collection at Item or ItemGroup level which will be inherited if applicable.

These are used to remove the dependency of agent specific configurations to make collection behave similarly irrespective of the agent used to execute the collection.

The behavior can be protocol specific or requester options. Currently supported protocol profile behaviors are:

- `strictSSL`<br/>
Enable or disable certificate verification.

- `followRedirects`<br/>
Follow HTTP 3xx responses as redirects.

- `maxRedirects`<br/>
Set maximum number of redirects to follow.

- `disableBodyPruning`<br/>
Control request body pruning for following methods: ```GET, COPY, HEAD, PURGE, UNLOCK```

- `followOriginalHttpMethod`<br/>
Redirect with the original HTTP method, by default redirects with HTTP method GET.

- `removeRefererHeaderOnRedirect`<br/>
Removes the `referer` header when a redirect happens.

- `tlsPreferServerCiphers:Boolean`<br/>
Use the server's cipher suite order instead of the client's during negotiation

- `tlsDisabledProtocols:Array`<br/>
the SSL and TLS protocol versions to disabled during negotiation

- `tlsCipherSelection:Array`<br/>
Order of cipher suites that the SSL server profile uses to establish a secure connection

**A collection with protocol profile behaviors:**

```javascript
{
  "info": {
    "name": "protocolProfileBehavior",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [{
    "name": "GET request with body using disableBodyPruning",
    "request": {
      "method": "GET",
      "body": {
        "mode": "raw",
        "raw": "foo=bar"
      },
      "url": "localhost:3000"
    },
    "protocolProfileBehavior": {
      "disableBodyPruning": true
    }
  }],
  "protocolProfileBehavior": {
    "followRedirects": false,
    "strictSSL": true
  }
}
```
