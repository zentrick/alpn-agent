const TLSSessionCache = require('@zentrick/tls-session-cache')

module.exports = {
  // TLS Session Cache that will be used by ALPNAgent.
  tlsSessionCache: TLSSessionCache.global,

  // Used by `https.Agent` to decide whether to retain sockets in the free cache
  // after they finish processing requests.
  // Used by `ALPNAgent` to activate TCP keep alive settings
  keepAlive: true,
  // Initial delay before starting to send TCP keep-alive packets
  keepAliveMsecs: 15000,

  // Whether or not to activate the TCP nodelay option
  noDelay: true,

  // Maximum number of H1 sockets to have active at the same time.
  maxSockets: 1024,
  // Maximum number of idle H1 sockets to retain in the free cache.
  maxFreeSockets: 256,

  // Maximum number of H2 sessions to have active at the same time.
  maxSessions: 1024,
  // Maximum number of idle H2 sessions to retain in the free cache.
  maxFreeSessions: 256,

  // Whether or not to reject TLS server certificates that are not
  // authoritative. (can be useful to disable for testing)
  rejectUnauthorized: true,

  // Allows overriding the default DNS lookup function.
  lookup: null,

  // The default maximum concurrent streams for H2 sessions.
  peerMaxConcurrentStreams: 1000
}
