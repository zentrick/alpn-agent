const EventEmitter = require('events')
const debug = require('debug')
const tls = require('tls')
const net = require('net')
const createConnectOptions = require('../util/connect-options')
const H1Stream = require('./stream')
const isSocketConnected = require('../util/socket-connected')
const isTlsSocketConnected = require('../util/tls-socket-connected')

const DEBUG = debug('h1::session')

const PROTOCOL_CONNECT = {
  'http:': (authority, options) => {
    const connectOptions = createConnectOptions(authority, options)
    return net.connect(connectOptions)
  },
  'https:': (authority, options) => {
    const connectOptions = createConnectOptions(authority, {
      ALPNProtocols: ['http/1.1'],
      ...options
    })
    DEBUG(connectOptions)
    return tls.connect(connectOptions)
  }
}

const PROTOCOL_IS_CONNECTED = {
  'http:': isSocketConnected,
  'https:': isTlsSocketConnected
}

const PROTOCOL_CONNECT_EVENTS = {
  'http:': 'connect',
  'https:': 'secureConnect'
}

const REMOTE_SETTINGS = Object.freeze(Object.assign(Object.create(null), {
  maxConcurrentStreams: 1
}))

const _authority = Symbol('authority')
const _options = Symbol('options')
const _socket = Symbol('socket')
const _queue = Symbol('queue')
const _active = Symbol('active')
const _connecting = Symbol('connecting')
const _closed = Symbol('closed')
const _destroyed = Symbol('destroyed')

class Http1Session extends EventEmitter {
  constructor (authority, options, listener) {
    super()
    this[_authority] = authority
    this[_options] = options
    this[_queue] = []
    this[_active] = null
    this[_connecting] = true
    this[_closed] = false
    this[_destroyed] = false
    if (listener != null) {
      this.on('connect', listener)
    }
    const {
      createConnection = PROTOCOL_CONNECT[authority.protocol]
    } = options
    DEBUG('creating connection')
    this[_socket] = createConnection(authority, options)
    if (PROTOCOL_IS_CONNECTED[this[_authority].protocol](this[_socket])) {
      process.nextTick(() => this._onConnect())
    } else {
      this[_socket].on(PROTOCOL_CONNECT_EVENTS[authority.protocol],
        () => this._onConnect())
    }
    this[_socket].on('error', err => this.emit('error', err))
    this[_socket].on('close', () => this._close())
  }

  get _authority () {
    return this[_authority]
  }

  get _socket () {
    return this[_socket]
  }

  get alpnProtocol () {
    return this[_authority].protocol === 'http:'
      ? 'h2c'
      : this[_socket].alpnProtocol
  }

  get closed () {
    return this[_closed]
  }

  get connecting () {
    return this[_connecting]
  }

  get destroyed () {
    return this[_destroyed]
  }

  get remoteSettings () {
    return REMOTE_SETTINGS
  }

  _onConnect () {
    DEBUG('socket connected')
    this[_connecting] = false
    this.emit('connect', this)
    this._startNextStream()
  }

  _close () {
    this[_closed] = true
    this.emit('close')
  }

  _startNextStream () {
    if (this[_queue].length > 0 && this[_active] == null) {
      this._startStream(this[_queue].shift())
    }
  }

  _startStream (next) {
    if (!this[_connecting] && this[_active] == null) {
      DEBUG('start stream')
      this[_active] = next
      next.once('close', () => this._endStream())
      next._start()
    } else {
      this[_queue].push(next)
    }
  }

  _endStream () {
    DEBUG('stream done')
    this[_active] = null
    this._startNextStream()
  }

  close (callback) {
    DEBUG('close')
    if (callback != null) {
      this.on('close', callback)
    }
    if (isSocketConnected(this[_socket])) {
      this[_socket].end()
    } else {
      this[_socket].destroy()
      this._close()
    }
  }

  destroy (error, code) {
    DEBUG('destroy')
    this[_destroyed] = true
    this[_socket].destroy()
    if (error != null) {
      this.emit('error', error)
    }
    this._close()
  }

  request (headers, options) {
    DEBUG('request', headers, options)
    const stream = new H1Stream(this, headers, options)
    this._startStream(stream)
    return stream
  }

  ref () {
    this[_socket].ref()
  }

  unref () {
    this[_socket].unref()
  }
}

module.exports = Http1Session
