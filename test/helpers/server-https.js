const https = require('https')
const url = require('url')
const serverBase = require('./server-base')
const certPromise = require('./cert')

module.exports = async (opts, port = null) => {
  const cert = await certPromise
  opts = Object.assign({}, cert, opts)
  return serverBase('https', 'https:', () => {
    const s = https.createServer(opts, (req, res) => {
      const parsedUrl = url.parse(req.url)
      s.emit(parsedUrl.pathname, req, res)
    })
    return s
  }, port)
}
