const DEFAULT_PORTS = {
  'http:': 80,
  'https:': 443
}

module.exports = (authority, options) => ({
  ...options,
  path: null,
  host: authority.hostname || 'localhost',
  servername: authority.hostname || 'localhost',
  port: authority.port || DEFAULT_PORTS[authority.protocol]
})
