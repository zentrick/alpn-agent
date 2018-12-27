const { globalAgent: httpAgent } = require('http')
const { globalAgent: httpsAgent } = require('https')

module.exports = (authority, options) => {
  const parsedAuthority = typeof authority === 'string'
    ? new URL(authority)
    : authority

  const { protocol, host, port } = parsedAuthority

  const agent = protocol === 'http:' ? httpAgent : httpsAgent

  return agent.getName({
    host,
    port,
    ...options
  })
}
