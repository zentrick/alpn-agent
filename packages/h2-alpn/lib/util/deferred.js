const _value = Symbol('value')
const _promise = Symbol('promise')
const _resolve = Symbol('resolve')
const _reject = Symbol('reject')

class Deferred {
  constructor () {
    this[_value] = undefined
    this[_promise] = new Promise((resolve, reject) => {
      this[_resolve] = resolve
      this[_reject] = reject
    })
  }

  get value () {
    return this[_value]
  }

  get promise () {
    return this[_promise]
  }

  resolve (value) {
    this[_value] = value
    this[_resolve](value)
  }

  reject (error) {
    this[_reject](error)
  }
}

module.exports = () => new Deferred()
