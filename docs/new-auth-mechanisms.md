It's very easy to add new authentication mechanisms in Runtime and SDK. This document outlines the steps to be 
done to add a new auth mechanism. For the purposes of this documentation, we'll call the new auth method `demo`.

## Define the data structure in the SDK.

Create a new file (`demo.js`) in `postman-collection/lib/collection/request-auth/`

The file needs to expose three properties, `name`, `update` and `authorize`.

```javascript
module.exports = {
    name: 'demo',
    update: function(params) {
        _.assign(this, params);
    },
    authorize: function(request) {
        // sign the request with header addition etc. This is not mandatory, and may not make
        // sense for all auths, in which case, just return the request.
        return request;
    }
}
```
    
Update `lib/collection/request-auth.js` to require your new auth method.

## Add your new authentication to Runtime

Create a new file `demo.js` in `postman-runtime/lib/authorizer/`

Every auth method needs to expose four different functionalities, `pre`, `post`, `init` and `_sign`. These
are called in the {@tutorial request-send-flow}.

```javascript
module.exports = {
    pre: function (context, requester, done) {
        done(null, true);
    },
 
    init: function (context, requester, done) {
        done(null);
    },

    post: function (context, requester, done) {
        done(null, true);
    },

    _sign: function (request) {
        return this.authorize(request);
    }
};
```

### `pre`
This function accepts three parameters, the context, a requester and a callback. The context contains information
about the current [Item](http://www.postmanlabs.com/postman-collection/Item.html), the cursor, etc.  The requester 
allows you to perform intermediate requests if necessary.

Ultimately, this function should check whether the required authentication parameters are present, and return a
boolean value indicating whether the pre-verification was successful.

e.g:
```javascript
pre: function demoAuthPreverification (context, requester, done) {
    // if nonce is not present, fail the pre-verification step.
    if (!this.nonce) {
        return done(null, false); 
    }
    done(null, true);
}
```

### `init`
If the pre-verification step returns a falsey value, the {@link Authorizer} will call this function. This function 
should ideally fetch all required parameters, by either sending requests or by asking the user for input, or any
other mechanism.

e.g:
```javascript
init: function demoAuthInitialize (context, requester, done) {
    var auth = this;
    requester.request(new sdk.Item({ request: 'http://demoserver.com' }), function(err, response) {
        auth.challenge = response.headers.get('authorization');
    });
}
```

### `post`
Once the request is sent and the response is received, the {@link Authorizer} will call this function. The job of this
function is to determine whether the request should be replayed. If the post-verification fails, the request is 
replayed (sent again).

e.g:
```javascript
post: function demoAuthPost (context, requester, done) {
    var auth = this;
    requester.request(new sdk.Item({ request: 'http://demoserver.com' }), function(err, response) {
        if (response.code === 401) {
            return done(null, false);  // replay the request
        }
        return done(null, true);  // don't replay
    });
}
```

### `_sign`

This function is in charge of calling the SDK's signing method. Eventually, it will become independent by itself.

e.g:
```javascript
    _sign: function demoSign (request) {
        return this.authorize(request);
    }
```
