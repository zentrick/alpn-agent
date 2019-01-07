const EventEmitter = require('events')
const debug = require('debug')
const H2StreamProxy = require('./h2-stream-proxy')
const forwardEvents = require('./util/forward-events')

const DEBUG = debug('h2::session-proxy')

const FORWARDED_EVENTS = [
  'altsvc',
  'connect',
  'error',
  'frameError',
  'goaway',
  'localSettings',
  'origin',
  'ping',
  'remoteSettings',
  'stream',
  'timeout'
]

const _authority = Symbol('authority')
const _options = Symbol('options')
const _closed = Symbol('closed')
const _destroyed = Symbol('destroyed')
const _reffed = Symbol('reffed')

class H2SessionProxy extends EventEmitter {
  constructor (authority, options, listener) {
    super()
    this[_authority] = authority
    this[_options] = options
    this[_closed] = false
    this[_reffed] = true
    if (listener != null) {
      this.on('connect', listener)
    }
    this.on('close', () => {
      this[_closed] = true
    })
  }

  get _authority () {
    return this[_authority]
  }

  get _options () {
    return this[_options]
  }

  get alpnProtocol () {
    const session = this._getSession()
    return session != null
      ? session.alpnProtocol
      : undefined
  }

  get closed () {
    return this[_closed]
  }

  get connecting () {
    // Check if there are any session that are connected
    const session = this._getSession(session => !session.connecting)
    return session == null
  }

  get destroyed () {
    return this[_destroyed]
  }

  get encrypted () {
    // Check if there are any session that are not encrypted
    const session = this._getSession(session => !session.encrypted)
    return session == null
  }

  get localSettings () {
    throw new Error('localSettings property not implemented')
  }

  get originSet () {
    throw new Error('originSet property not implemented')
  }

  get pendingSettingsAck () {
    throw new Error('pendingSettingsAck property not implemented')
  }

  get remoteSettings () {
    // TODO: implement
    return Object.create(null)
  }

  get socket () {
    return new EventEmitter()
  }

  get state () {
    throw new Error('state property not implemented')
  }

  get type () {
    throw new Error('type property not implemented')
  }

  _getSession (condition = null) {
    throw new Error('Abstract method')
  }

  _getAvailableSession (onAvailable) {
    throw new Error('Abstract method')
  }

  async _forEachSession (action) {
    throw new Error('Abstract method')
  }

  _addSession (session) {
    forwardEvents(session, this, FORWARDED_EVENTS, (evt, ...args) => {
      DEBUG(this.constructor.name, 'event', evt)
    })
    if (this[_reffed]) {
      session.ref()
    } else {
      session.unref()
    }
  }

  close (callback) {
    DEBUG('close')
    if (callback != null) {
      this.on('close', callback)
    }
    this._forEachSession(async session => {
      if (!session.closed) {
        DEBUG('closing backend session')
        await new Promise((resolve, reject) => {
          session.close(resolve)
        })
        DEBUG('closed backend session')
      }
    }).then(() => {
      DEBUG('closed all backend sessions')
      this.emit('close')
    })
  }

  destroy (error, code) {
    DEBUG('destroy')
    this[_destroyed] = true
    this._forEachSession(async session => {
      if (!session.closed && !session.destroyed) {
        await new Promise((resolve, reject) => {
          session.once('close', resolve)
          session.destroy(error, code)
        })
      }
    }).then(() => {
      if (error != null) {
        this.emit('error', error)
      }
      this.emit('close')
    })
  }

  goaway () {
    throw new Error('goaway method not implemented')
  }

  ping () {
    throw new Error('ping method not implemented')
  }

  ref () {
    this[_reffed] = true
    this._forEachSession(session => session.ref())
  }

  setTimeout () {
    throw new Error('setTimeout method not implemented')
  }

  settings () {
    throw new Error('settings method not implemented')
  }

  unref () {
    this[_reffed] = false
    this._forEachSession(session => session.unref())
  }

  request (headers, options) {
    DEBUG(this.constructor.name, 'request', headers)
    let session = null
    let streamProxy = null
    this._getAvailableSession(availableSession => {
      session = availableSession
      if (streamProxy != null) {
        const stream = session.request(headers, options)
        streamProxy.setBackend(stream)
      }
    })
    if (session != null) {
      return session.request(headers, options)
    } else {
      streamProxy = new H2StreamProxy(headers, options)
      return streamProxy
    }
  }
}

module.exports = H2SessionProxy
