const ALPN_H1 = 'http/1.1'
const ALPN_H2 = 'h2'

module.exports = {
  ALPN_H1,
  ALPN_H2,
  DEFAULT_PROTOCOLS: [ALPN_H2, ALPN_H1],
  DEFAULT_TLS_SESSION_CACHE_SIZE: 4096
}
