const http2 = require('http2')
const tls = require('tls')
const debug = require('debug')
const TLSSessionCache = require('@zentrick/tls-session-cache')
const Http2SessionProxy = require('../h2/session-proxy')
const Http1Session = require('../h1/session')
const createConnectOptions = require('../util/connect-options')

const DEBUG = debug('https::connect')

const sessionFactories = {
  'h2': (authority, options, socket) =>
    http2.connect(authority, {
      ...options,
      createConnection: (authority, options) => socket
    }),
  'http/1.1': (authority, options, socket) =>
    new Http1Session(authority, {
      ...options,
      createConnection: (authority, options) => socket
    })
}

const socketErrorHandler = sessionProxy => err => {
  sessionProxy.emit('error', err)
  sessionProxy.close()
}

module.exports = (authority, options, listener) => {
  const sessionProxy = new Http2SessionProxy(authority, options, listener)
  const {
    tlsSessionCache = TLSSessionCache.global
  } = options
  const connectOptions = createConnectOptions(authority, {
    ALPNProtocols: ['h2', 'http/1.1'],
    ...options
  })
  const name = TLSSessionCache.getName(connectOptions)
  if (connectOptions.session == null && tlsSessionCache != null) {
    connectOptions.session = tlsSessionCache.load(name)
  }
  DEBUG('opening TLS socket to', connectOptions.host, connectOptions.port)
  const errorHandler = socketErrorHandler(sessionProxy)
  const socket = tls.connect(connectOptions, () => { // Fired on secureConnect
    DEBUG(
      'ALPN protocol for', connectOptions.host, connectOptions.port,
      'is', socket.alpnProtocol
    )
    if (tlsSessionCache != null) {
      tlsSessionCache.save(name, socket.getSession())
    }
    if (socket.alpnProtocol === false) {
      errorHandler(new Error('ALPN negotiation failed'))
      return
    }
    socket.removeListener('error', errorHandler)
    const createSession = sessionFactories[socket.alpnProtocol]
    const session = createSession(authority, options, socket)
    sessionProxy._setBackend(session)
  })
  socket.once('error', errorHandler)
  if (tlsSessionCache != null) {
    socket.once('error', () => {
      tlsSessionCache.evict(name)
    })
  }
  return sessionProxy
}
