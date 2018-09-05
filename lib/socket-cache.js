const _cache = Symbol('cache')

class SocketCache {
  constructor () {
    this[_cache] = {}
  }

  dispose () {
    for (const name of Object.keys(this[_cache])) {
      for (const socket of this[_cache][name]) {
        this._disposeSocket(socket)
      }
    }
    this[_cache] = {}
  }

  push (name, socket) {
    const existing = this[_cache][name]
    if (existing == null) {
      this[_cache][name] = [socket]
    } else {
      existing.push(socket)
    }
  }

  remove (name, socket) {
    const existing = this[_cache][name]
    if (existing != null) {
      const i = existing.indexOf(socket)
      if (i >= 0) {
        existing.splice(i, 1)
      }
    }
  }

  pop (name) {
    const existing = this[_cache][name]
    return existing == null
      ? undefined
      : existing.pop()
  }

  peek (name) {
    const existing = this[_cache][name]
    return existing == null || existing.length === 0
      ? undefined
      : existing[0]
  }

  has (name) {
    const existing = this[_cache][name]
    return existing != null && existing.length > 0
  }

  _disposeSocket (s) {
    (s.close || s.end).call(s)
  }
}

module.exports = SocketCache
