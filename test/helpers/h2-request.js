const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS
} = require('http2').constants

module.exports = async (t, session) => {
  const request = session.request({
    [HTTP2_HEADER_PATH]: '/200'
  })
  await Promise.all([
    new Promise((resolve, reject) => {
      request.on('response', (headers) => {
        t.is(headers[HTTP2_HEADER_STATUS], 200)
        resolve()
      })
      request.on('error', reject)
    }),
    new Promise((resolve, reject) => {
      let data = ''
      request.on('data', chunk => {
        data += chunk
      })
      request.on('end', () => {
        t.is(data, 'OK')
        resolve()
      })
    }),
    new Promise((resolve, reject) => {
      request.on('close', resolve)
    })
  ])
}
