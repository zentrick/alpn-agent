const { connect } = require('@zentrick/h2-pooled-session')
const debug = require('debug')
const getName = require('./get-name')

const DEBUG = debug('h2::pool')

const _options = Symbol('options')
const _name = Symbol('name')
const _origin = Symbol('origin')
const _origins = Symbol('origins')
const _idle = Symbol('idle')

class Pool {
  constructor (options) {
    this[_options] = {
      keepAlive: false,
      maxSessions: 4,
      maxFreeSessions: 64,
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

  get maxSessions () {
    return this[_options].maxSessions
  }

  get maxFreeSessions () {
    return this[_options].maxFreeSessions
  }

  _evictOrigin (origin) {
    DEBUG('evict origin')
    this[_origins].delete(origin[_name])
  }

  _evictIdle () {
    if (this[_idle].size > 0) {
      for (const session of this[_idle]) {
        DEBUG('evict idle session')
        this._popIdle(session)
        return session[_origin].evictIdle(session)
      }
    } else {
      DEBUG('no idle sessions to evict')
      return false
    }
  }

  _popIdle (session) {
    this[_idle].delete(session)
  }

  _pushIdle (session) {
    if (this[_idle].size === this.maxFreeSessions) {
      // Kill the oldest idle session in favor of this more recent one
      DEBUG('reached maximum idle sessions, evicting oldest')
      this._evictIdle()
    }
    if (this[_idle].size < this.maxFreeSessions) {
      DEBUG('add idle session')
      this[_idle].add(session)
      return true
    } else {
      DEBUG('do not add idle session')
      return false
    }
  }

  _getConnectOptions (authority, options) {
    return {
      ...this[_options],
      ...options
    }
  }

  async destroy () {
    DEBUG('destroy')
    return Promise.all(
      [...this[_origins].values()].map(origin => origin.destroy())
    )
  }

  createSession (authority, options) {
    DEBUG('create origin', authority)
    const name = getName(authority, options)
    const tagSession = session => {
      DEBUG('tagging session')
      session[_origin] = origin
    }
    const origin = connect(authority, options, tagSession)
    origin[_name] = name
    origin.on('addSession', tagSession)
    origin.on('idleSession', session => {
      if (!this.keepSessionAlive(session) || !this._pushIdle(session)) {
        origin.evictIdle(session)
      }
    })
    origin.on('activateSession', session => {
      DEBUG('activate session')
      this._popIdle(session)
      this.reuseSession(session)
    })
    origin.on('removeSession', () => {
      if (origin.sessionCount === 0) {
        this._evictOrigin(origin)
      }
    })
    this[_origins].set(name, origin)
    return origin
  }

  keepSessionAlive (session) {
    if (this.keepAlive) {
      DEBUG('keep session alive')
      session.unref()
      return true
    } else {
      DEBUG('do not keep session alive')
      return false
    }
  }

  reuseSession (session) {
    session.ref()
  }

  connect (authority, options) {
    DEBUG('connect', authority)
    const connectOptions = this._getConnectOptions(authority, options)
    const name = getName(authority, connectOptions)
    let origin = this[_origins].get(name)
    if (origin == null) {
      origin = this.createSession(authority, connectOptions)
    } else {
      DEBUG('reuse existing origin')
    }
    return origin
  }
}

module.exports = Pool
