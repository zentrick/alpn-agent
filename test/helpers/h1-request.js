const https = require('https')

module.exports = async (t, options) => {
  await new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      t.is(res.statusCode, 200)
      let data = ''
      res.on('data', chunk => {
        data += chunk
      })
      res.on('end', () => {
        t.is(data, 'OK')
        resolve()
      })
    })
    req.end()
  })
}
