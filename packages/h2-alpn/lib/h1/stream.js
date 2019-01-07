const stream = require('stream')
const debug = require('debug')
const http = require('http')
const https = require('https')
const createRequestOptions = require('./request-options')

const PROTOCOL_IMPL = {
  'http:': http,
  'https:': https
}

const DEBUG = debug('h1::stream')

const IGNORE_RES_HEADERS = new Set([
  'connection',
  'content-length',
  'transfer-encoding'
])

const createHeaders = (statusCode, headers) => {
  const result = Object.create(null)
  result[':status'] = statusCode
  if (headers != null) {
    for (const key of Object.keys(headers)) {
      if (!key.startsWith(':') && !IGNORE_RES_HEADERS.has(key)) {
        result[key] = headers[key]
      }
    }
  }
  return result
}

const _session = Symbol('session')
const _headers = Symbol('headers')
const _options = Symbol('options')
const _request = Symbol('request')
const _response = Symbol('response')
const _writes = Symbol('writes')

class H1Stream extends stream.Duplex {
  constructor (session, headers, options) {
    super()
    this[_session] = session
    this[_headers] = headers
    this[_options] = options
    this[_request] = null
    this[_response] = null
    this[_writes] = null
  }

  _start () {
    const h1Options = createRequestOptions(
      this[_session],
      this[_headers],
      this[_options]
    )
    DEBUG('start request')
    this[_request] = PROTOCOL_IMPL[h1Options.protocol]
      .request(h1Options, res => {
        DEBUG('response received', res.statusCode)
        this[_response] = res
        const headers = createHeaders(res.statusCode, res.headers)
        this.emit('response', headers)
        res.on('error', err => {
          DEBUG('error', err)
        })
        res.on('data', data => {
          DEBUG('data')
          if (!this.push(data)) {
            res.pause()
          }
        })
        res.on('end', data => {
          DEBUG('end')
          this.push(null)
          this.emit('close')
        })
      })
    if (this[_writes] != null) {
      for (const item of this[_writes]) {
        if (typeof item !== 'function') {
          const [chunk, encoding, callback] = item
          DEBUG('writing', chunk.length)
          this[_request].write(chunk, encoding, callback)
        } else {
          DEBUG('ending request body')
          this[_request].end(item)
        }
      }
    }
    if (this[_options] == null || this[_options].endStream) {
      DEBUG('end request body')
      this[_request].end()
    }
  }

  _write (chunk, encoding, callback) {
    if (this[_request] != null) {
      DEBUG('writing', chunk.length)
      this[_request].write(chunk, encoding, callback)
    } else {
      DEBUG('write buffering', chunk.length)
      const write = [chunk, encoding, callback]
      if (this[_writes] == null) {
        this[_writes] = [write]
      } else {
        this[_writes].push(write)
      }
    }
  }

  _final (callback) {
    if (this[_request] != null) {
      DEBUG('ending request body')
      this[_request].end(callback)
    } else {
      DEBUG('end request body buffering')
      const write = callback
      if (this[_writes] == null) {
        this[_writes] = [write]
      } else {
        this[_writes].push(write)
      }
    }
  }

  _read (size) {
    if (this[_response] != null) {
      DEBUG('reading', size)
      this[_response].resume()
    } else {
      DEBUG('ignoring read', size)
    }
  }
}

module.exports = H1Stream
