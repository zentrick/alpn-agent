const http = require('http')
const url = require('url')
const serverBase = require('./server-base')

module.exports = (opts, port = null) => {
  return serverBase('http', 'http:', () => {
    const s = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url)
      s.emit(parsedUrl.pathname, req, res)
    })
    return s
  }, port)
}
