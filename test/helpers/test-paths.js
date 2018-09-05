module.exports = servers => {
  servers.on('/200', (req, res) => {
    res.end('OK')
  })
}
