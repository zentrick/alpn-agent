# Packages

This repository contains the following packages:
- `@zentrick/fetch` provides a [Fetch](https://fetch.spec.whatwg.org/) like
  interface that transparently handles connection pooling and both h1 and h2
  support.
- `@zentrick/h2-alpn` provides an H2 implementation that transparently handles
  both http and https connections, and transparently handles H1 and H2 servers
  over https by doing ALPN negotiation. All of these scenarios are exposed
  as an API that matches the native Node `http2` API.
- `@zentrick/h2-pool` provides a pool management class that built on top of
  `@zentrick/h2-pooled-session`. It will manage a list of origins and maintain
  a maximum number of idle sessions across all origins. When that maximum is
  reached it will evict the oldest session.
- `@zentrick/h2-pooled-session` provides an H2 implementation in which one
  session maps to multiple backend sessions, and manages stream allocation to
  these backend sessions by accounting for each individual session's
  `maxConcurrentStreams`.
- `@zentrick/h2-util` contains a number of helper classes that deal with the
  proxying of H2 sessions and streams.
- `@zentrick/tls-session-cache` provides a helper class that deals with caching
  of TLS sessions for faster connection setup times. In the Node https agents,
  this is handled out of the box for you.

`fetch` can be used like a normal browser fetch:
```js
const response = await fetch('https://www.google.com')
console.log(await response.text())
```

`h2-alpn` and `h2-pooled-session` can be used independently or combined. To use
them together, you can do the following:
```js
const { connect } = require('@zentrick/h2-pooled-session')
const session = connect(authority, {
  createSession: require('@zentrick/h2-alpn').connect
})
```

The same can be done to combine `h2-alpn` and `h2-pool` as follows:
```js
const Pool = require(`@zentrick/h2-pool`)
const pool = new Pool({
  keepAlive: true,
  createSession: require('@zentrick/h2-alpn').connect
})
```
