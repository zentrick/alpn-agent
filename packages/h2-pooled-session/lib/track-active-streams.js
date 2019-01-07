const debug = require('debug')

const DEBUG = debug('h2::pooled-session::streams')

const _request = Symbol('request')
const _activeStreams = Symbol('activeStreams')
const _onOpen = Symbol('onOpen')
const _onClose = Symbol('onClose')

const request = function (...args) {
  const stream = this[_request](...args)
  this[_activeStreams]++
  DEBUG(`stream opened, active:`, this[_activeStreams])
  this[_onOpen](this, stream)
  stream.on('close', () => {
    this[_activeStreams]--
    DEBUG(`stream closed, active:`, this[_activeStreams])
    this[_onClose](this, stream)
  })
  return stream
}

exports.trackActiveStreams = (session, onOpen, onClose) => {
  session[_activeStreams] = 0
  session[_request] = session.request
  session[_onOpen] = onOpen
  session[_onClose] = onClose
  session.request = request
}

exports.getActiveStreams = session => {
  return session[_activeStreams]
}
