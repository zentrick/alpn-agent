const TLSSessionCache = require('./tls-session-cache')

module.exports = {
  tlsSessionCache: TLSSessionCache.global,
  keepAlive: true,
  keepAliveMsecs: 15000,
  maxSockets: 1024,
  maxFreeSockets: 256,
  maxSessions: 1024,
  maxFreeSessions: 256,
  rejectUnauthorized: true,
  noDelay: true,
  lookup: null,
  peerMaxConcurrentStreams: 1000
}
