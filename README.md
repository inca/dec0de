# dec0de

Protocol buffers handler/parser based on awesome ES6 generators.

## WTF? (What's That For?)

### The Problem

Handling low-level protocol data (e.g. received via socket or stream)
can be tricky b/c data is received in packets.

E.g. assume typical HTTP request line:

```
GET / HTTP/1.1\r\n
```

A typical server will have this code to accept requests:

```es6
server.on('connection', socket => {
  socket.on('data', data => {
    // handle buffers
  });
});
```

Each `data` is a buffer that contains _some_ request fragment.
It can contain the entire request line, it can contain only it's fragment
(e.g. `GET / HTTP`), it can contain more than that.
It can even be received char-by-char.

In order to handle protocols your server needs to:

  * accumulate buffers
  * maintain internal parsing states (typically, microstates for processing each token)
  * organize state changing and buffer consumption
  * provide a notion for "wait for data"
  * handle protocol expectations and throw errors

```es6
server.on('connection', socket => {

  // protocol messages output
  const out = new EventEmitter();

  // we need parser state
  let state = 'expect-http-status-line';

  // we need accumulated buffer for handling data
  // received via multiple 'data' event
  let remaining = Buffer.alloc(0);

  socket.on('data', data => {
    // accumulate buffer
    remaining = Buffer.concat([remaining, data]);
    // handle parser state
    switch (state) {
      case 'expect-http-status-line':
        // see if we have accumulated required data for this state
        const i = remaining.indexOf('\r\n');
        if (i === -1) {
          // we need more data
          return;
        }
        // extract protocol-specific data, emit it
        const line = remaining.slice(0, i);
        out.emit('request-line', line)
        // don't forget to consume stuff from buffer
        remaining = remaining.slice(i);
        // don't forget to enter next state
        state = 'expect-headers';
        // phew, we're done here
        break;
      // now handle more protocol parts (headers, body, etc) :(
    }
  });

});
```

In other words, there's a whole lot of cross-cutting concerns which can easily
make your incoming data handler an awful mix of I/O handling, state maintenance
and protocol-specific logic — error prone, unreadable and unmaintainable.

### The Solution

Meet dec0de — low-level abstraction for handling buffers and expectations.

Thanks to awesome ES6 generators our previous switch-case-based parser state
handler can be written in a single line:

```es6
function* decodeHttpRequest() {
  const line = yield buf => buf.indexOf('\r\n');
  c
}
```

Parsing state is maintained via generated iterators in a natural, readable and reliable manner.
Internally, dec0de will also handle memory-efficient buffer accumulation/consumption
and generator lifecycle (instantiate, pause and resume). All that's left for you is
to implement protocol handling logic.

Here's our previous example:

```es6
function* decodeHttpRequest() {
  const line = yield buf => buf.indexOf('\r\n');
  out.emit('request-line', line);
  // handle next protocol parts (headers, body, etc.)
}

server.on('connection', socket => {
  const decoder = new Decoder(decodeHttpRequest);
  socket.on('data', data => decoder.decode(data));
});
```

Please refer to [some tests](test/) for more examples.

## Usage

```
npm i --save dec0de
```

