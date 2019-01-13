const Body = require('./body')
const Headers = require('./headers')
const RequestCache = require('./constants/request-cache')
const RequestCredentials = require('./constants/request-credentials')
const RequestMode = require('./constants/request-mode')
const RequestRedirect = require('./constants/request-redirect')

const DEFAULT_OPTIONS = Object.freeze({
  body: null,
  cache: RequestCache.DEFAULT,
  credentials: RequestCredentials.SAME_ORIGIN,
  headers: null,
  integrity: '',
  method: 'GET',
  mode: RequestMode.CORS,
  redirect: RequestRedirect.FOLLOW,
  referrer: 'no-referrer',
  signal: null
})

const _cache = Symbol('cache')
const _credentials = Symbol('credentials')
const _headers = Symbol('headers')
const _integrity = Symbol('integrity')
const _method = Symbol('method')
const _mode = Symbol('mode')
const _redirect = Symbol('redirect')
const _referrer = Symbol('referrer')
const _signal = Symbol('signal')
const _url = Symbol('url')

class Request extends Body {
  constructor (url, init) {
    super()
    if (url instanceof Request) {
      this[_cache] = url[_cache]
      this[_credentials] = url[_credentials]
      this[_headers] = new Headers(url[_headers])
      this[_integrity] = url[_integrity]
      this[_method] = url[_method]
      this[_mode] = url[_mode]
      this[_redirect] = url[_redirect]
      this[_referrer] = url[_referrer]
      this[_signal] = url[_signal]
      this[_url] = url[_url]
    } else {
      init = Object.assign(Object.create(null), DEFAULT_OPTIONS, init)
      this[_cache] = init.cache
      this[_credentials] = init.credentials
      this[_headers] = new Headers(init.headers)
      this[_integrity] = init.integrity
      this[_method] = init.method
      this[_mode] = init.mode
      this[_redirect] = init.redirect
      this[_referrer] = init.referrer
      this[_signal] = init.signal
      this[_url] = '' + url
    }
  }

  get cache () {
    return this[_cache]
  }

  get credentials () {
    return this[_credentials]
  }

  get destination () {
    return ''
  }

  get headers () {
    return this[_headers]
  }

  get integrity () {
    return this[_integrity]
  }

  get method () {
    return this[_method]
  }

  get mode () {
    return this[_mode]
  }

  get redirect () {
    return this[_redirect]
  }

  get referrer () {
    const referrer = this[_referrer]
    return referrer === 'no-referrer' ? '' : referrer
  }

  get referrerPolicy () {
    return ''
  }

  get signal () {
    return this[_signal]
  }

  get url () {
    return this[_url]
  }

  clone () {
    return new Request(this)
  }
}

module.exports = Request
