const connectHttp = require('./http')
const connectHttps = require('./https')

const connectMethods = {
  'http:': connectHttp,
  'https:': connectHttps
}

module.exports = (authority, options, listener) => {
  authority = typeof authority === 'string' ? new URL(authority) : authority
  return connectMethods[authority.protocol](authority, options, listener)
}
