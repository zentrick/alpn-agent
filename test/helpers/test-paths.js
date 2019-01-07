const url = require('url')

const getQuery = req => url.parse(req.url, true).query

module.exports = servers => {
  servers.on('/200', (req, res) => {
    res.end('OK')
  })
  servers.on('/wait', (req, res) => {
    const { delay = 1000 } = getQuery(req)
    setTimeout(parseInt(delay, 10), () => {
      res.end(`Waited ${delay}`)
    })
  })
  servers.on('/echo-body', (req, res) => {
    req.pipe(res)
  })
  servers.on('/echo-header', (req, res) => {
    const { name } = getQuery(req)
    res.end(req.headers[name])
  })
}
