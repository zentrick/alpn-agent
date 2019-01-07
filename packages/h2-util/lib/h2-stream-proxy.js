const stream = require('stream')
const debug = require('debug')
const defer = require('p-defer')
const forwardEvents = require('./util/forward-events')

const DEBUG = debug('h2::stream-proxy')

const FORWARDED_EVENTS = [
  'aborted',
  'close',
  'continue',
  'error',
  'frameError',
  'headers',
  'push',
  'response',
  'timeout',
  'trailers',
  'wantTrailers'
]

const _backend = Symbol('backend')

class H2StreamProxy extends stream.Duplex {
  constructor () {
    super()
    this[_backend] = defer()
  }

  setBackend (backend) {
    forwardEvents(backend, this, FORWARDED_EVENTS, (evt) => {
      DEBUG(evt)
    })
    backend.on('data', this._data.bind(this))
    backend.on('end', this._end.bind(this))
    this[_backend].resolve(backend)
  }

  _write (chunk, encoding, callback) {
    this[_backend].promise.then(backend => {
      DEBUG('writing', chunk.length)
      backend.write(chunk, encoding, callback)
    })
  }

  _final (callback) {
    this[_backend].promise.then(backend => {
      DEBUG('ending')
      backend.end(callback)
    })
  }

  _read (size) {
    this[_backend].promise.then(backend => {
      DEBUG('reading', size)
      backend.resume()
    })
  }

  _data (data) {
    DEBUG('data', data.length)
    if (!this.push(data)) {
      this[_backend].promise.then(backend => {
        backend.pause()
      })
    }
  }

  _end () {
    DEBUG('end')
    this.push(null)
  }
}

module.exports = H2StreamProxy
