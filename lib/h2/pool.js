const EventEmitter = require('events')
const debug = require('debug')
const http2 = require('http2')
const getName = require('./get-name')
const Origin = require('./pool-origin')
const { ALPN_H2 } = require('../constants')
const TLSSessionCache = require('../tls-session-cache')

const DEBUG = debug('h2::pool')

const _options = Symbol('options')
const _origins = Symbol('origins')
const _idle = Symbol('idle')

class Pool extends EventEmitter {
  constructor (options) {
    super()
    this[_options] = {
      keepAlive: false,
      maxSessions: 8,
      maxFreeSessions: 1,
      ALPNProtocols: [ALPN_H2],
      tlsSessionCache: TLSSessionCache.global,
      ...options
    }
    this[_origins] = new Map()
    this[_idle] = []
  }

  get origins () {
    return this[_origins]
  }

  get keepAlive () {
    return this[_options].keepAlive
  }

  get tlsSessionCache () {
    return this[_options].tlsSessionCache
  }

  get maxSessions () {
    return this[_options].maxSessions
  }

  _createOrigin (name) {
    const origin = new Origin(name, this)
    this[_origins].set(name, origin)
    return origin
  }

  _getOrCreateOrigin (authority, options) {
    const name = this.getName(authority, options)
    return this[_origins].get(name) || this._createOrigin(name)
  }

  async destroy () {
    return Promise.all(
      [...this[_origins].values()].map(origin => origin.destroy())
    )
  }

  getName (authority, options) {
    return getName(authority, options)
  }

  createSession (authority, options) {
    const connectOptions = {
      ...this[_options],
      ...options
    }
    DEBUG('connect', authority)
    return http2.connect(authority, connectOptions)
  }

  keepSessionAlive (session) {
    if (this.keepAlive) {
      session.unref()
      return true
    } else {
      return false
    }
  }

  reuseSession (session) {
    session.ref()
  }

  async getSession (authority, options) {
    return this._getOrCreateOrigin(authority, options).get(authority, options)
  }
}

module.exports = Pool
