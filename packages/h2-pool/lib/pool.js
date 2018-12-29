const debug = require('debug')
const http2 = require('http2')
const getName = require('./get-name')
const Origin = require('./pool-origin')
const TLSSessionCache = require('@zentrick/tls-session-cache')
const { getSessionName } = require('./session-name')

const ALPN_H2 = 'h2'

const DEBUG = debug('h2::pool')

const _options = Symbol('options')
const _origins = Symbol('origins')
const _idle = Symbol('idle')

class Pool {
  constructor (options) {
    this[_options] = {
      keepAlive: false,
      maxSessions: 8,
      maxFreeSessions: 1,
      ALPNProtocols: [ALPN_H2],
      tlsSessionCache: TLSSessionCache.global,
      ...options
    }
    this[_origins] = new Map()
    this[_idle] = new Set()
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

  get maxFreeSessions () {
    return this[_options].maxFreeSessions
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

  _evictIdle () {
    if (this[_idle].size > 0) {
      for (const session of this[_idle]) {
        this[_idle].delete(session)
        const name = getSessionName(session)
        const origin = this[_origins].get(name)
        return origin._evictIdle(session)
      }
    } else {
      return false
    }
  }

  _popIdle (session) {
    this[_idle].delete(session)
  }

  _pushIdle (session) {
    if (this[_idle].size === this.maxFreeSessions) {
      // Kill the oldest idle session in favor of this more recent one
      this._evictIdle()
    }
    if (this[_idle].size < this.maxFreeSessions) {
      this[_idle].add(session)
      return true
    } else {
      return false
    }
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

  async connect (authority, options) {
    return this._getOrCreateOrigin(authority, options)
      .connect(authority, options)
  }
}

module.exports = Pool
