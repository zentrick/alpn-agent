const tls = require('tls')
const { Agent } = require('https')
const debug = require('debug')
const SocketCache = require('./socket-cache')
const TLSSessionCache = require('./tls-session-cache')
const createH2Session = require('./create-h2-session')
const {
  ALPN_H1,
  ALPN_H2,
  DEFAULT_PROTOCOLS
} = require('./constants')
const { _name } = require('./symbols')
const prepareOptions = require('./prepare-options')
const DEFAULT_OPTIONS = require('./default-options')

const DEBUG = debug('alpn-agent')
const DEBUG_DNS = debug('alpn-agent::dns')
const DEBUG_TCP = debug('alpn-agent::tcp')
const DEBUG_TLS = debug('alpn-agent::tls')

const _tlsSessionCache = Symbol('sessionCache')
const _h1 = Symbol('h1Connections')
const _h2 = Symbol('h2Sessions')
const _options = Symbol('options')

class ALPNAgent extends Agent {
  constructor (options = DEFAULT_OPTIONS) {
    options = Object.assign({}, DEFAULT_OPTIONS, options)
    super(options)
    this[_options] = options
    this[_tlsSessionCache] = options.tlsSessionCache
    this[_h1] = new SocketCache()
    this[_h2] = new SocketCache()
  }

  static get TLSSessionCache () {
    return TLSSessionCache
  }

  get tlsSessionCache () {
    return this[_tlsSessionCache]
  }

  destroy () {
    this[_h1].dispose()
    this[_h2].dispose()
    super.destroy()
  }

  // Called by `https.Agent` when no socket is available in the free cache
  createConnection (options, cb) {
    this.createH1Session(options)
      .then(socket => cb(null, socket))
      .catch(err => cb(err, null))
  }

  async createH1Session (options) {
    options = this._prepareOptions(options, [ALPN_H1])
    const socket = this[_h1].pop(options[_name])
    if (socket != null) {
      DEBUG('use cached h1 connection')
      return socket
    } else {
      DEBUG('create new h1 connection')
      return this._createALPNConnection(options)
    }
  }

  async createH2Session (options) {
    options = this._prepareOptions(options, [ALPN_H2])
    const session = this[_h2].peek(options[_name])
    if (session != null) {
      DEBUG('use cached h2 connection')
      return session
    } else {
      DEBUG('create new h2 connection')
      const socket = await this._createALPNConnection(options)
      return this._cacheSocket(options, socket)
    }
  }

  async negotiateALPN (options) {
    options = this._prepareOptions(options, DEFAULT_PROTOCOLS)
    const socket = await this._createALPNConnection(options)
    this._cacheSocket(options, socket)
    return socket.alpnProtocol
  }

  _cacheSocket (options, socket) {
    DEBUG(`caching ${socket.alpnProtocol} connection`)
    const [cache, session] = socket.alpnProtocol === ALPN_H2
      ? [this[_h2], createH2Session(options, socket)]
      : [this[_h1], socket]
    session.once('error', () => {
      cache.remove(options[_name], session)
    })
    cache.push(options[_name], session)
    return session
  }

  _prepareOptions (options, protocols) {
    return prepareOptions(
      options,
      this.getName(options),
      protocols,
      this[_options]
    )
  }

  _createALPNConnection (options) {
    return new Promise((resolve, reject) => {
      const connectStart = Date.now()
      const name = options[_name]
      DEBUG_TLS(`connect over ${options.ALPNProtocols}`)

      if (this[_tlsSessionCache] != null) {
        options.session = this[_tlsSessionCache].load(name)
      }

      const socket = tls.connect(options, () => { // Fired on secureConnect
        DEBUG_TLS(`connected over ${socket.alpnProtocol} after ${Date.now() - connectStart}ms`)
        if (this[_tlsSessionCache] != null) {
          this[_tlsSessionCache].save(name, socket.getSession())
        }
        socket.removeListener('error', reject)
        socket.removeListener('timeout', reject)
        resolve(socket)
      })

      socket.once('lookup', () => {
        DEBUG_DNS(`resolved after ${Date.now() - connectStart}ms`)
      })
      socket.once('connect', () => {
        DEBUG_TCP(`connected after ${Date.now() - connectStart}ms`)
      })
      socket.once('error', reject)
      socket.once('timeout', reject)
      socket.once('error', () => {
        if (this[_tlsSessionCache] != null) {
          // Evict TLS session cache when we closed due to a transmission error
          this[_tlsSessionCache].evict(options[_name])
        }
      })

      // Apply TCP socket options
      const { keepAlive, keepAliveMsecs, noDelay } = this[_options]
      socket.setKeepAlive(keepAlive, keepAliveMsecs)
      socket.setNoDelay(noDelay)
    })
  }
}

module.exports = ALPNAgent
