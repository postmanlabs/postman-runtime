Postman Runtime has a queue-command based architecture, which allows a lot of flexibility
when adding new behavior. Each concept below is explained in detail in its own module documentation.

### Commands

Each command accepts a payload and a callback, which should be called when the command is complete.
By convention, the callback that indicates completion is called `next()` in the code.

There is also the ability to pass additional information to the command, it will be covered in a
later section.

Example commands:

1. `test-script`

    This command accepts a _test_ [`Event`](http://www.postmanlabs.com/postman-collection/Event.html) as a part
    of its payload, and runs the script using [`postman-sandbox`](https://github.com/postmanlabs/postman-sandbox).

2. `item`

    This command is in charge of queuing a `prerequest`, `request` and `test` command, one after the other. It also
    performs intermediate error handling. As you can see, a command has the option to queue other commands.

There are other commands too. They'll be explained in a later section.

### Command (Instruction) Processer

```text

-------------------------------
 C1 | C2 | C3 | C4 | ....
-------------------------------
  ^   ^
  |   |
  |   +---- Next command
  |
  +-------- Current command
```

The commands are added to a queue, and processed one after the other. At any time,
only one command may be running (but a command has the flexibility to run multiple tasks
in parallel).

Commands have the ability to manipulate the queue, by queueing additional commands, or interrupting the
queue.

### Triggers

Triggers are the main interface through which Runtime interacts with the outside world. When starting a Run,
users have the ability to provide a set of triggers to runtime. These are functions, which are called at specific
times during a run. There are a great number of triggers supported by runtime, and new triggers are added
regularly.

Example triggers:

1.  `start`

    This trigger is called when runtime is ready to start a new run (but before actually starting it).

2. `beforeRequest`

    Before sending a request, runtime calls this trigger, and provides information about the request which is
    about to be sent. This includes the final request, after variable resolution, authentication handlers, etc.

Check the readme for a complete list of supported triggers.

### Requester

Runtime allows sending requests from any command. This is done using a `Requester`. While the current implementation
has only an HTTP requester, the architecture is such that we can add more types of requesters, such as
Websocket, or even FTP.

The HTTP requester accepts an Item, and returns the response, cookies and the sent request. It also adds
extra headers, such as a `User-Agent`.

### Request Flow

Runtime supports a complicated request control flow, and performs multiple tasks such as:

1. Variable Resolution
2. Signing the request for various types of authentication mechanisms
3. Reading of file attachements
4. Looking up proxy information if required
5. Loading client side SSL certificates
6. Actually sending the request
7. Determining if a replay is necessary (auth)
8. Replaying a request

### Authorizer

A big part of the flow above is controlled by the Authorizer, which ultimately takes the call on
whether a request was successfully signed, and decides whether it should be replayed.

Runtime supports the following auths
1. Basic
2. Digest
3. AWS Signature
4. OAuth-1
5. Oauth-2
6. Hawk
7. NTLM

To know how to add a new auth, see this doc {@tutorial new-auth-mechanisms}.

Each auth implements the {@link AuthHandlerInterface} which has the following hooks:
- pre
- init
- sign
- post
