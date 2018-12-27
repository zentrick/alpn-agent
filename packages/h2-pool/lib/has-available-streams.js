const { getActiveStreams } = require('./track-active-streams')

module.exports = session => {
  const active = getActiveStreams(session)
  const max = session.remoteSettings.maxConcurrentStreams
  return active && max ? active < max : true
}
