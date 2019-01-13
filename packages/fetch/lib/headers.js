const isHeaderName = require('./util/is-header-name')
const isHeaderValue = require('./util/is-header-value')
const normalizeHeaderValue = require('./util/normalize-header-value')
const HeadersGuard = require('./constants/headers-guard')
const HeaderList = require('./header-list')

const throwIfInvalidName = name => {
  if (!isHeaderName(name)) {
    throw new Error(`Invalid header name: "${name}"`)
  }
}
const throwIfInvalidValue = value => {
  if (!isHeaderValue(value)) {
    throw new Error(`Invalid header value: "${value}"`)
  }
}

const _list = Symbol('list')
const _guard = Symbol('guard')

class Headers {
  constructor (init = null) {
    this[_list] = new HeaderList()
    this[_guard] = HeadersGuard.NONE
    if (init != null) {
      this._fill(init)
    }
  }

  _fill (init) {
    if (Array.isArray(init)) {
      for (const header of init) {
        if (!Array.isArray(header) || header.length !== 2) {
          throw new Error('Invalid header initialization structure')
        }
        this.append(header[0], header[1])
      }
    } else {
      const iterable = Symbol.iterator in init ? init : Object.entries(init)
      for (const [key, value] of iterable) {
        this.append(key, value)
      }
    }
  }

  _throwIfImmutable () {
    if (this[_guard] === HeadersGuard.IMMUTABLE) {
      throw new Error('Headers are immutable')
    }
  }

  append (name, value) {
    value = normalizeHeaderValue(value)
    throwIfInvalidName(name)
    throwIfInvalidValue(value)
    this._throwIfImmutable()
    // NOTE: other guards are not enforced

    this[_list].append(name, value)
  }

  delete (name) {
    throwIfInvalidName(name)
    this._throwIfImmutable()
    // NOTE: other guards are not enforced

    this[_list].delete(name)
  }

  get (name) {
    throwIfInvalidName(name)
    return this[_list].get(name)
  }

  has (name) {
    throwIfInvalidName(name)
    return this[_list].contains(name)
  }

  set (name, value) {
    value = normalizeHeaderValue(value)
    throwIfInvalidName(name)
    throwIfInvalidValue(value)
    this._throwIfImmutable()
    // NOTE: other guards are not enforced

    this[_list].set(name, value)
  }

  [Symbol.iterator] () {
    return this[_list].sortCombine()[Symbol.iterator]()
  }
}

module.exports = Headers
