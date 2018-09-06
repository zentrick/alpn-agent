# alpn-agent

A helper library to deal with ALPN negotiation of TLS connections.

Exposes an `ALPNAgent` class which inherits from `https.Agent` but extends it
with the following:
- `ALPNAgent#negotiateALPN(options)` which connects to the specified host and
  negotiates the ALPN protocol, returning a `Promise` to the negotiated protocol
  as a string.
- `ALPNAgent#createH1Session(options)` which connects to the specified host and
  negotiates an `http/1.1` TLS socket. Returns a `Promise` to a Node
  `tls.TLSSocket`.
- `ALPNAgent#createH2Session(options)` which connects to the specified host and
  negotiates an `h2` session. Returns a `Promise` to a Node
  `http2.ClientHttp2Session`.

# Use as a standard `Agent`

Because `ALPNAgent` inherits from `https.Agent` you can use it as a drop-in
replacement in any existing `https` request, without having to use the `h2`
capabilities.

# Use in "mixed mode"

To use the library to its full potential, you'd follow the following pattern
when performing an HTTP request:

```js
if (options.protocol === 'https') {
  const alpnProto = await alpnAgent.negotiateALPN(options)
  if (alpnProto === 'h2') {
    const session = await alpnAgent.createH2Session(options)
    // perform standard h2 request against this `ClientHttp2Session`
  } else {
    // perform standard https request with `agent` option set to the `ALPNAgent`
    // instance
  }
} else {
  // perform standard http request with `agent` option set to a standard
  // `http.Agent` instance
}
```

# Optimizations

- Calling `negotiateALPN` might establish a new socket to the remote host, this
  socket will be remembered in a cache for future use when you perform a request
  against this remote host.
- Calling `negotiateALPN` will return without establishing a new connection, if
  an existing negotiated connection is already available to provide the answer.
- The `ALPNAgent` will maintain a TLS session cache for you which will enable
  fast session resumption on subsequent connections.
- By default, the Nagle algorithm will be disabled on all sockets by calling
  `socket.setNoDelay(true)`.
- You can provide an optional `lookup` function through the `ALPNAgent`
  constructor options if you'd like to redirect DNS lookups to your own
  function. This can be useful if you'd like to cache DNS responses locally.
