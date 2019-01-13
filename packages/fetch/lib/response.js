const Body = require('./body')
const Headers = require('./headers')
const ResponseType = require('./constants/response-type')

const DEFAULT_OPTIONS = Object.freeze({
  status: 200,
  statusText: '',
  headers: null
})

const _status = Symbol('status')
const _statusText = Symbol('statusText')
const _headers = Symbol('headers')

class Response extends Body {
  constructor (body, init) {
    super(body)
    init = Object.assign(Object.create(null), DEFAULT_OPTIONS, init)
    this[_status] = init.status
    this[_statusText] = init.statusText
    this[_headers] = new Headers(init.headers)
  }

  get headers () {
    return this[_headers]
  }

  get ok () {
    return this[_status] >= 200 && this[_status] < 300
  }

  get redirected () {
    return false // TODO
  }

  get status () {
    return this[_status]
  }

  get statusText () {
    return this[_statusText]
  }

  get type () {
    return ResponseType.BASIC
  }

  get url () {

  }

  clone () {

  }

  static error () {

  }

  static redirect (url, status) {

  }
}

module.exports = Response
