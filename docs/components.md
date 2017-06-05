This is information about some of the internal & external constructs in Postman Runtime. 
At a high level, Postman Runtime contains a few major components, each of which controls 
a different part of the actual collection run.

### `Runner`

The `Runner` is in charge of initializing a run. It takes care of sanitizing the input collection, extracting
the [`Item`s](http://www.postmanlabs.com/postman-collection/Item.html) to run and manipulating the iteration data 
based on the number of iterations. Finally, it returns a [`Run`](#run) object.

### `Cursor`

Internally, every collection run is represented as a 2D array of requests:

```text

               +------------------- Current Request
               |
               v
       0   1   2   3   4   5   ......
     +---+---+---+---+---+---+---+---+---+---+
  0  |   |   |   |   |   |   |   |   |   |   |
     +---+---+---+---+---+---+---+---+---+---+
  1  |   |   | * |   |   |   |   |   |   |   | <----- Current Iteration
     +---+---+---+---+---+---+---+---+---+---+
  2  |   |   |   |   |   |   |   |   |   |   |
     +---+---+---+---+---+---+---+---+---+---+
  3  |   |   |   |   |   |   |   |   |   |   |
     +---+---+---+---+---+---+---+---+---+---+
```

The cursor points to a unique request in the collection. Every [trigger](/architecture#triggers) that is called
when sending an Item will have the corresponding cursor as a part of its arguments.

Every cursor has a `ref` property, which is a UUID. The `ref` is unique to each item, and is always updated
when runtime moves in the grid (either to the next request, or because of `postman.setNextRequest()` usage in
the sandbox). The same request in different iterations will have a different `ref`.

### `Run`

This is the handle to controlling and manipulating a collection run. It holds the entire state of the run (the currently
running request, all requests to be run, current iteration, etc.)

If a run needs to be paused, resumed or aborted, the `Run` object provides the ability to do that.

It also allows you to lookup an Item using its cursor.

### `Requester`

The HTTP requester is in charge of actually sending requests. It is in charge of sending requests,
maintaining the cookie store, adding additional information to the request, etc.

The requester can be configured with additional options to control the request behavior, such as
enabling redirects, ssl certificate verification, etc.
