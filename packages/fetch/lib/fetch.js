const Pool = require('@zentrick/h2-pool')
const Request = require('./request')
const Response = require('./response')
const {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS
} = require('http2').constants
const debug = require('debug')

const DEBUG = debug('h2::fetch')

const CONNECTION_POOL = new Pool({
  keepAlive: true,
  maxFreeSessions: 256,
  createSession: require('@zentrick/h2-alpn').connect
})

const maybeAbort = (signal, reject = null) => {
  if (signal == null || !signal.aborted) {
    return false
  }
  const abortErr = new Error('Aborted')
  if (reject != null) {
    reject(abortErr)
  } else {
    throw abortErr
  }
  return true
}

module.exports = async (input, init) => {
  const request = new Request(input, init)
  if (typeof input === 'string') {
    input = new Request(input, init)
  }
  maybeAbort(request.signal)
  const url = new URL(input.url)
  DEBUG('fetch', url)
  const { rejectUnauthorized = true } = init || {}
  const session = CONNECTION_POOL.connect(url, {
    rejectUnauthorized
  })
  DEBUG('session')
  const stream = session.request({
    [HTTP2_HEADER_METHOD]: input.method,
    [HTTP2_HEADER_PATH]: `${url.pathname}${url.search}`
  }, {
    endStream: input.body == null
  })
  DEBUG('stream')
  if (input.body != null) {
    input.body.pipe(stream)
  }
  return new Promise((resolve, reject) => {
    stream.on('response', rawHeaders => {
      if (maybeAbort(request.signal, reject)) {
        return
      }
      DEBUG('response', rawHeaders)
      const {
        [HTTP2_HEADER_STATUS]: status,
        ...headers
      } = rawHeaders
      const statusText = ''
      resolve(new Response(stream, {
        status,
        statusText,
        headers,
        signal: request.signal
      }))
    })
    stream.on('error', reject)
  })
}
