const H2PooledSession = require('./lib/pooled-session')

const connect = (authority, options, listener) => {
  return new H2PooledSession(authority, options, listener)
}

module.exports = { connect }
