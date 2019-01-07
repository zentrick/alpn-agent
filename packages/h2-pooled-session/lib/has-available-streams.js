const { getActiveStreams } = require('./track-active-streams')
const debug = require('debug')

const DEBUG = debug('h2::pooled-session::streams-available')

module.exports = (session, peerMaxConcurrentStreams) => {
  const active = getActiveStreams(session)
  const max =
    session.remoteSettings.maxConcurrentStreams || peerMaxConcurrentStreams
  const result = active && max ? active < max : true
  DEBUG(active, 'of', max, 'in use =>', result)
  return result
}
