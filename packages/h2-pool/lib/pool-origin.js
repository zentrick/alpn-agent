const defer = require('p-defer')
const debug = require('debug')
const {
  trackActiveStreams,
  getActiveStreams
} = require('./track-active-streams')
const trackTlsSessions = require('./track-tls-sessions')
const hasAvailableStreams = require('./has-available-streams')
const closeSession = require('./close-session')
const removeFromArray = require('./util/remove-from-array')
const { setSessionName } = require('./session-name')

const _name = Symbol('name')
const _pool = Symbol('pool')
const _debug = Symbol('debug')
const _active = Symbol('activeSessions')
const _idle = Symbol('idleSessions')
const _queued = Symbol('queuedSessions')

const DEBUG_EVENTS = ['connect', 'timeout', 'error', 'close']

class Origin {
  constructor (name, pool) {
    this[_name] = name
    this[_pool] = pool
    this[_debug] = debug(`h2::pool::${name}`)
    this[_active] = []
    this[_idle] = []
    this[_queued] = []
  }

  get sessions () {
    return this[_active].length + this[_idle].length
  }

  get idleSessions () {
    return this[_idle].length
  }

  _findActive () {
    // Reuse oldest session with available streams (scan from the front)
    const session = this[_active].find(hasAvailableStreams)
    if (session != null) {
      this[_debug]('reusing active session')
    }
    return session
  }

  _evictIdle (session) {
    removeFromArray(this[_idle], session)
    this._closeSession(session)
  }

  _popIdle () {
    if (this[_idle].length === 0) {
      return null
    }
    // Reuse most recently used session (pop from the back)
    const session = this[_idle].pop()
    this[_pool]._popIdle(session)
    this[_active].push(session)
    this[_pool].reuseSession(session)
    this[_debug]('reusing idle session')
    return session
  }

  _pushIdle (session) {
    removeFromArray(this[_active], session)
    const keepAlive = this[_pool].keepSessionAlive(session)
    if (keepAlive === false) {
      this[_debug]('closing idle session due to disinterest')
      this._closeSession(session)
    } else if (this[_pool]._pushIdle(session) === false) {
      this[_debug]('closing idle session due to lack of space')
      this._closeSession(session)
    } else {
      this[_debug]('remembering idle session')
      this[_idle].push(session)
    }
  }

  _closeSession (session) {
    session.close()
  }

  _createNew (authority, options) {
    if (this.sessions >= this[_pool].maxSessions) {
      return null
    }
    this[_debug]('creating new session')
    const tlsSessionCache = this[_pool].tlsSessionCache
    options = {
      session: tlsSessionCache != null
        ? tlsSessionCache.load(this[_name])
        : null,
      ...options
    }
    const session = this[_pool].createSession(authority, options)
    setSessionName(session, this[_name])
    trackActiveStreams(session, () => {
      if (!this._dequeue(session) && getActiveStreams(session) === 0) {
        this._pushIdle(session)
      }
    })
    if (tlsSessionCache != null) {
      trackTlsSessions(this[_name], session, tlsSessionCache)
    }
    session.once('close', () => {
      this._removeSession(session)
    })
    /* istanbul ignore if */
    if (this[_debug].enabled) {
      DEBUG_EVENTS.forEach(event => session.once(event, () => {
        this[_debug](`session ${event}`)
      }))
    }
    this[_active].push(session)
    this[_debug](`created session, ${this.sessions} in total`)
    return session
  }

  async _queue (authority, options) {
    this[_debug]('queueing session request')
    const d = defer()
    this[_queued].push(d)
    return d.promise
  }

  _dequeue (session) {
    if (this[_queued].length > 0) {
      this[_debug]('dequeueing session request')
      this[_queued].shift().resolve(session)
      return true
    } else {
      return false
    }
  }

  _removeSession (session) {
    removeFromArray(this[_active], session)
    removeFromArray(this[_idle], session)
    this[_debug](`removed session, ${this.sessions} remaining`)
  }

  async destroy () {
    this[_debug](`destroying ${this.sessions} remaining sessions`)
    return Promise.all(
      [...this[_active], ...this[_idle]].map(closeSession)
    )
  }

  async connect (authority, options) {
    return this._findActive() ||
      this._popIdle() ||
      this._createNew(authority, options) ||
      this._queue(authority, options)
  }
}

module.exports = Origin
