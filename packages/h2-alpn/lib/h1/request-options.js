const createSocketConnection = require('../util/create-socket-connection')
const isSocketConnected = require('../util/socket-connected')
const isTlsSocketConnected = require('../util/tls-socket-connected')

const DEFAULT_PORTS = {
  'http:': 80,
  'https:': 443
}

const IS_CONNECTED = {
  'http:': isSocketConnected,
  'https:': isTlsSocketConnected
}

const createHeaders = headers => {
  const result = Object.create(null)
  result['connection'] = 'keep-alive'
  if (headers != null) {
    for (const key of Object.keys(headers)) {
      if (!key.startsWith(':')) {
        result[key] = headers[key]
      }
    }
  }
  return result
}

module.exports = (session, headers, requestOptions) => ({
  method: (headers && headers[':method']) || 'GET',
  path: (headers && headers[':path']) || '/',
  headers: createHeaders(headers),
  protocol: session._authority.protocol,
  host: session._authority.hostname || 'localhost',
  port: session._authority.port || DEFAULT_PORTS[session._authority.protocol],
  createConnection: createSocketConnection(
    session._socket,
    IS_CONNECTED[session._authority.protocol]
  )
})
