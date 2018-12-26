const applyDefaultStrict = require('./util/apply-default-strict')
const applyDefault = require('./util/apply-default')
const getHostName = require('./util/get-host-name')
const { _name } = require('./symbols')

module.exports = (options, name, protocols, defaults) => {
  // servername is required for TLS SNI to work
  options = Object.assign({}, options)
  applyDefault(options, 'servername', getHostName(options))
  applyDefault(options, 'ALPNProtocols', protocols)
  applyDefault(options, 'port', 443)
  applyDefault(options, 'lookup', defaults.lookup)
  applyDefaultStrict(options, 'rejectUnauthorized', defaults.rejectUnauthorized)
  applyDefaultStrict(options, 'peerMaxConcurrentStreams',
    defaults.peerMaxConcurrentStreams)
  options.path = null
  options[_name] = name
  return options
}
