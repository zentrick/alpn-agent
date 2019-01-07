const { H2SessionProxy } = require('@zentrick/h2-util')
const http2 = require('http2')
const debug = require('debug')
const { trackActiveStreams, getActiveStreams } = require('./track-active-streams')
const hasAvailableStreams = require('./has-available-streams')

const DEBUG = debug('h2::pooled-session')

const _keepAlive = Symbol('keepAlive')
const _peerMaxConcurrentStreams = Symbol('peerMaxConcurrentStreams')
const _maxSessions = Symbol('maxSessions')
const _backends = Symbol('backends')
const _queued = Symbol('queued')

const DEFAULT_MAX_SESSIONS = 100
const DEFAULT_MAX_STREAMS = 100
const DEFAULT_CONDITION = session => session != null
const isIdle = session => !session.connecting && getActiveStreams(session) === 0

class H2PooledSession extends H2SessionProxy {
  constructor (authority, options, listener) {
    options = {
      keepAlive: false,
      peerMaxConcurrentStreams: DEFAULT_MAX_STREAMS,
      maxSessions: DEFAULT_MAX_SESSIONS,
      ...options
    }
    super(authority, options, listener)
    this[_keepAlive] = Boolean(options.keepAlive)
    this[_peerMaxConcurrentStreams] = options.peerMaxConcurrentStreams
    this[_maxSessions] = options.maxSessions
    this[_backends] = []
    this[_queued] = []
    this._createSession()
  }

  get sessionCount () {
    return this[_backends].length
  }

  get activeSessionCount () {
    let active = 0
    for (const backend of this[_backends]) {
      if (!isIdle(backend)) {
        active++
      }
    }
    return active
  }

  get idleSessionCount () {
    return this.sessionCount - this.activeSessionCount
  }

  _getSession (condition = null) {
    return this[_backends].find(condition || DEFAULT_CONDITION)
  }

  _getAvailableSession (onAvailable) {
    const session = this._getSession(session =>
      hasAvailableStreams(session, this[_peerMaxConcurrentStreams])
    )
    if (session != null) {
      onAvailable(session)
    } else if (this[_backends].length < this[_maxSessions]) {
      this._createSession(onAvailable)
    } else {
      DEBUG('queueing session request, total:', this[_queued].length + 1)
      this[_queued].push(onAvailable)
    }
  }

  _createSession (onCreate = null) {
    DEBUG('creating new session')
    const connect = this._options.createSession || http2.connect
    const session = connect(this._authority, this._options)
    trackActiveStreams(
      session,
      this._streamOpened.bind(this),
      this._streamClosed.bind(this)
    )
    this[_backends].push(session)
    this._addSession(session)
    session.on('close', () => {
      DEBUG('removing closed session')
      this._removeSession(session)
    })
    this.emit('addSession', session)
    if (onCreate != null) {
      onCreate(session)
    }
  }

  _removeSession (session) {
    const i = this[_backends].indexOf(session)
    if (i >= 0) {
      this[_backends].splice(i)
      this.emit('removeSession', session)
    }
    if (!session.closed) {
      session.close()
    }
    return i >= 0
  }

  async _forEachSession (action) {
    await Promise.all(this[_backends].map(action))
  }

  _streamOpened (session, stream) {
    if (getActiveStreams(session) === 1) {
      DEBUG('session active')
      this.emit('activateSession', session)
    }
  }

  _streamClosed (session, stream) {
    if (session.closed || session.destroyed) {
      DEBUG('not reusing closed session')
      return
    }
    if (this[_queued].length > 0) {
      const onAvailable = this[_queued].shift()
      DEBUG(
        'resolving queued session request, remaining:',
        this[_queued].length
      )
      onAvailable(session)
    }
    if (isIdle(session)) {
      if (!this[_keepAlive]) {
        DEBUG('closing idle session')
        this._removeSession(session)
      } else {
        DEBUG('session idle')
        this.emit('idleSession', session)
      }
    }
  }

  evictIdle (session = null) {
    if (session == null) {
      session = this[_backends].find(isIdle)
      if (session == null) {
        return false
      }
    }
    DEBUG('evicting idle session')
    return this._removeSession(session)
  }
}

module.exports = H2PooledSession
