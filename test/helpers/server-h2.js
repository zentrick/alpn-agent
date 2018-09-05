const http2 = require('http2')
const serverBase = require('./server-base')
const certPromise = require('./cert')

module.exports = async (opts, port = null) => {
  const cert = await certPromise
  opts = Object.assign({
    maxSessionMemory: 32,
    peerMaxConcurrentStreams: 4096
  }, cert, opts)
  return serverBase('h2', 'https:', () => {
    const s = http2.createSecureServer(opts)
    s.on('request', (req, res) => s.emit(req.url, req, res))
    return s
  }, port)
}
