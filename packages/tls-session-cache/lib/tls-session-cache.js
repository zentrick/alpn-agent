const LRU = require('lru-cache')
const debug = require('debug')
const { globalAgent } = require('https')

const DEFAULT_TLS_SESSION_CACHE_SIZE = 4096

const DEBUG = debug('tls::session-cache')

const _cache = Symbol('cache')
const _hits = Symbol('hits')
const _misses = Symbol('misses')
const _evictions = Symbol('evictions')

class TLSSessionCache {
  constructor (size = DEFAULT_TLS_SESSION_CACHE_SIZE) {
    this[_cache] = new LRU(size)
    this[_hits] = 0
    this[_misses] = 0
    this[_evictions] = 0
  }

  static get global () {
    return DEFAULT_TLS_SESSION_CACHE
  }

  static getName (options) {
    return globalAgent.getName(options)
  }

  get hits () {
    return this[_hits]
  }

  get misses () {
    return this[_misses]
  }

  get evictions () {
    return this[_evictions]
  }

  load (name) {
    const session = this[_cache].get(name)
    if (session != null) {
      DEBUG(`hit`, name)
      this[_hits]++
      return session
    } else {
      DEBUG(`miss`, name)
      this[_misses]++
      return null
    }
  }

  evict (name) {
    DEBUG(`evict`, name)
    this[_evictions]++
    this[_cache].del(name)
  }

  save (name, session) {
    DEBUG(`save`, name, session != null)
    this[_cache].set(name, session)
  }
}

const DEFAULT_TLS_SESSION_CACHE = new TLSSessionCache()

module.exports = TLSSessionCache
