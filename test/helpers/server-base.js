const { promisify } = require('util')
const getPort = require('get-port')
const debug = require('debug')

const DEBUG = debug('alpn-agent::test-server')

const host = 'localhost'

module.exports = async (name, proto, createFn, port = null) => {
  const s = createFn()

  let socketId = 0
  let sockets = {}
  s.on('connection', (sock) => {
    const id = socketId++
    sockets[id] = sock
    sock.on('close', () => {
      delete sockets[id]
    })
  })

  const serverClose = promisify(s.close).bind(s)
  s.close = async () => {
    for (const sock of Object.values(sockets)) {
      if (!sock.destroyed) {
        sock.end()
      }
    }
    await serverClose()
  }

  s.on('error', (err) => DEBUG('error', err))
  s.on('clientError', (err, sock) => {
    // HPE_INVALID_METHOD happens when we receive a request with method = `PRI`
    // this is not in fact a valid request, but it happens when an H2 request
    // ends up on an HTTP1 server.
    if (err.code !== 'HPE_INVALID_METHOD') {
      DEBUG('clientError', err)
    }
    sock.end('HTTP/1.1 400 Bad Request\r\n\r\n')
  })
  s.on('streamError', (err) => DEBUG('streamError', err))
  s.on('socketError', (err) => DEBUG('socketError', err))
  s.on('sessionError', (err) => DEBUG('sessionError', err))
  s.on('unknownProtocol', (sock) => {
    DEBUG('Server: unknownProtocol, closing socket')
    sock.destroy()
  })
  s.on('upgrade', (req, sock) => {
    DEBUG('Server: upgrade requested, closing socket')
    sock.destroy()
  })

  s.host = host
  s.protocol = proto

  const gettingPort = port == null
    ? getPort()
    : Promise.resolve(port)

  gettingPort.then((port) => {
    s.port = port
    s.url = `${proto}//${host}:${port}`
  })

  const serverListen = promisify(s.listen).bind(s)
  s.listen = () => gettingPort.then(serverListen)

  s.timeout = 1000000
  s.keepAliveTimeout = 5000

  return s
}
