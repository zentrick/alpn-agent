const EventEmitter = require('events')

// https://dom.spec.whatwg.org/#aborting-ongoing-activities

const _signal = Symbol('signal')
const _aborted = Symbol('aborted')
const _algorithms = Symbol('algorithms')

class AbortController {
  constructor () {
    this[_signal] = new AbortSignal()
  }

  get signal () {
    return this[_signal]
  }

  abort () {
    this.signal._abort()
  }
}

class AbortSignal extends EventEmitter {
  constructor () {
    super()
    this[_aborted] = false
    this[_algorithms] = []
  }

  get aborted () {
    return this[_aborted]
  }

  _abort () {
    if (this.aborted) {
      return
    }
    this[_aborted] = true
    for (const algorithm of this[_algorithms]) {
      algorithm()
    }
    this[_algorithms].splice(0)
    this.emit('abort')
  }

  add (algorithm) {
    if (this.aborted) {
      return
    }
    this[_algorithms].push(algorithm)
  }

  remove (algorithm) {
    const index = this[_algorithms].indexOf(algorithm)
    if (index >= 0) {
      this[_algorithms].splice(index)
    }
  }

  follow (parent) {
    if (this.aborted) {
      return
    }
    if (parent.aborted) {
      this._abort()
    } else {
      parent.add(() => this._abort())
    }
  }
}

module.exports = AbortController
