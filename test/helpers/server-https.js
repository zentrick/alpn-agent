const https = require('https')
const serverBase = require('./server-base')
const certPromise = require('./cert')

module.exports = async (opts, port = null) => {
  const cert = await certPromise
  opts = Object.assign({}, cert, opts)
  return serverBase('https', 'https:', () => {
    const s = https.createServer(opts, (req, res) => s.emit(req.url, req, res))
    return s
  }, port)
}
