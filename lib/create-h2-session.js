const h2 = require('http2')

module.exports = (options, socket) => {
  const authority = `${options.protocol}//${options.host}`
  return h2.connect(authority, {
    createConnection: (url, options) => socket,
    settings: {
      enablePush: false
    }
  })
}
