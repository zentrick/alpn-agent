const h2 = require('http2')

const DEFAULT_H2_SETTINGS = {
  enablePush: false
}

const getAuthority = ({ protocol, host }) => `${protocol}//${host}`

const getConnectOptions = (options, socket) => Object.assign({}, options, {
  createConnection: (url, options) => socket,
  settings: Object.assign({}, DEFAULT_H2_SETTINGS, options.settings)
})

module.exports = (options, socket) => h2.connect(
  getAuthority(options),
  getConnectOptions(options, socket)
)
