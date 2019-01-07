const { H2SessionProxy } = require('@zentrick/h2-util')
const defer = require('../util/deferred')

const _backend = Symbol('backend')

class Http2SessionProxy extends H2SessionProxy {
  constructor (authority, options, listener) {
    super(authority, options, listener)
    this[_backend] = defer()
  }

  _setBackend (backend) {
    this._addSession(backend)
    this[_backend].resolve(backend)
  }

  _getSession (condition = null) {
    const backend = this[_backend].value
    return backend != null && (condition == null || condition(backend))
      ? backend
      : null
  }

  _getAvailableSession (onAvailable) {
    const backend = this[_backend].value
    if (backend != null) {
      onAvailable(backend)
    } else {
      this[_backend].promise.then(onAvailable)
    }
  }

  async _forEachSession (action) {
    const backend = this[_backend].value
    if (backend != null) {
      await action(backend)
    }
  }
}

module.exports = Http2SessionProxy
