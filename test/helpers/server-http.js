const http = require('http')
const serverBase = require('./server-base')

module.exports = (opts, port = null) => {
  return serverBase('http', 'http:', () => {
    const s = http.createServer((req, res) => s.emit(req.url, req, res))
    return s
  }, port)
}
