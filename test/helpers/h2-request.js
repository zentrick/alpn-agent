const {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS
} = require('http2').constants

const SCENARIOS = {
  'simple': {
    reqHeaders: {
      [HTTP2_HEADER_PATH]: '/200'
    },
    resHeaders: {
      [HTTP2_HEADER_STATUS]: 200
    },
    resBody: 'OK'
  },
  'echo-body': {
    reqHeaders: {
      [HTTP2_HEADER_METHOD]: 'POST',
      [HTTP2_HEADER_PATH]: '/echo-body'
    },
    reqBody: 'hello world',
    resHeaders: {
      [HTTP2_HEADER_STATUS]: 200
    },
    resBody: 'hello world'
  },
  'custom-header': {
    reqHeaders: {
      [HTTP2_HEADER_PATH]: '/echo-header?name=x-custom-header',
      'x-custom-header': 'hello world'
    },
    resHeaders: {
      [HTTP2_HEADER_STATUS]: 200
    },
    resBody: 'hello world'
  }
}

module.exports = async (t, session, scenario = 'simple') => {
  const { reqHeaders, reqBody, resHeaders, resBody } = SCENARIOS[scenario]
  const request = session.request(reqHeaders, {
    endStream: reqBody == null
  })
  if (reqBody != null) {
    request.write(Buffer.from(reqBody))
    request.end()
  }
  await Promise.all([
    new Promise((resolve, reject) => {
      request.on('response', (headers) => {
        delete headers.date
        t.deepEqual(headers, resHeaders)
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
        t.is(data, resBody)
        resolve()
      })
    }),
    new Promise((resolve, reject) => {
      request.on('close', resolve)
    })
  ])
}
