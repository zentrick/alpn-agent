const test = require('ava')
const util = require('util')
const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS
} = require('http2').constants
const H2Agent = require('../')
const { Servers, createTestPaths, expectTlsCacheStats } = require('./helpers')

let servers

const FAILING_HOST = {
  hostname: 'localhost',
  port: 0
}

test.before(async t => {
  servers = new Servers(['h2', 'https'])
  await servers.start()
  createTestPaths(servers)
})

test.after.always(async t => {
  servers.stop()
  servers = null
})

test.beforeEach(t => {
  const agent = new H2Agent({
    tlsSessionCache: new H2Agent.TLSSessionCache()
  })
  // Promisify the agent `createConnection` function from the Node API
  // so we can easily call it from our tests
  agent.promisifiedAgentCreate =
    util.promisify(agent.createConnection.bind(agent))
  t.context.agent = agent
})

test.afterEach.always(async t => {
  if (t.context.agent != null) {
    await t.context.agent.destroy()
    t.context.agent = null
  }
})

;[
  {
    proto: 'h2',
    alpn: 'h2',
    sessionType: 'ClientHttp2Session',
    createFn: 'createH2Session'
  },
  {
    proto: 'https',
    alpn: 'http/1.1',
    sessionType: 'TLSSocket',
    createFn: 'promisifiedAgentCreate'
  }
].forEach(({proto, alpn, sessionType, createFn}) => {
  test(`negotiates an ${proto} connection`, async t => {
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    expectTlsCacheStats(t, {hits: 0, misses: 1, evictions: 0})
  })

  test(`${proto} session fails on an unresponsive host`, async t => {
    await t.throws(t.context.agent[createFn](FAILING_HOST))
  })

  test(`creates an ${proto} session with negotiation`, async t => {
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    const session = await t.context.agent[createFn](servers[proto])
    expectTlsCacheStats(t, {hits: 0, misses: 1, evictions: 0})
    t.is(session.constructor.name, sessionType)
  })

  test(`creates an ${proto} session witout negotiation`, async t => {
    const session = await t.context.agent[createFn](servers[proto])
    t.is(session.constructor.name, sessionType)
  })

  test(`does not renegotiate ALPN if result is known to be ${proto}`, async t => {
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    expectTlsCacheStats(t, {hits: 0, misses: 1, evictions: 0})
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    expectTlsCacheStats(t, {hits: 0, misses: 1, evictions: 0})
  })

  test(`reuses cached TLS session info for ${proto}`, async t => {
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    expectTlsCacheStats(t, {hits: 0, misses: 1, evictions: 0})
    t.context.agent.destroy()
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    expectTlsCacheStats(t, {hits: 1, misses: 1, evictions: 0})
  })

  test(`evicts TLS session cache on ${proto} transmission error`, async t => {
    const session = await t.context.agent[createFn](servers[proto])
    expectTlsCacheStats(t, {hits: 0, misses: 1, evictions: 0})
    const closed = new Promise((resolve, reject) => {
      session.once('close', resolve)
    })
    session.destroy(new Error('transmission error'))
    await closed
    expectTlsCacheStats(t, {hits: 0, misses: 1, evictions: 1})
    await t.context.agent[createFn](servers[proto])
    expectTlsCacheStats(t, {hits: 0, misses: 2, evictions: 1})
  })
})

test('initializes with global TLS session cache by default', t => {
  const agent = new H2Agent()
  t.is(agent.tlsSessionCache, H2Agent.TLSSessionCache.global)
})

test('creates a TLS session cache instance if none is provided', t => {
  const agent = new H2Agent({
    tlsSessionCache: null
  })
  t.truthy(agent.tlsSessionCache)
})

test(`ALPN negotiation fails on an unresponsive host`, async t => {
  await t.throws(t.context.agent.negotiateALPN(FAILING_HOST))
})

test('can perform an h2 request', async t => {
  const session = await t.context.agent.createH2Session(servers.h2)
  const request = session.request({
    [HTTP2_HEADER_PATH]: '/200'
  })
  await Promise.all([
    new Promise((resolve, reject) => {
      request.on('response', (headers) => {
        t.is(headers[HTTP2_HEADER_STATUS], 200)
        resolve()
      })
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
    })
  ])
})
