const Http1Session = require('../h1/session')

module.exports = (authority, options, listener) =>
  new Http1Session(authority, options, listener)
