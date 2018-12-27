const debug = require('debug')

const DEBUG = debug('h2::pool::streams')

const _request = Symbol('request')
const _activeStreams = Symbol('activeStreams')
const _onFree = Symbol('onFree')

const request = function (...args) {
  const stream = this[_request](...args)
  DEBUG(`stream opened`)
  this[_activeStreams]++
  stream.on('close', () => {
    DEBUG(`stream closed`)
    this[_activeStreams]--
    this[_onFree]()
  })
  return stream
}

exports.trackActiveStreams = (session, onFree) => {
  session[_activeStreams] = 0
  session[_request] = session.request
  session[_onFree] = onFree
  session.request = request
}

exports.getActiveStreams = session => {
  return session[_activeStreams]
}
