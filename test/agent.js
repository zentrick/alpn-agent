const test = require('ava')
const util = require('util')
const ALPNAgent = require('../')
const {
  Servers,
  createTestPaths,
  expectH1Stats,
  expectTlsCacheStats,
  h1request,
  h2request
} = require('./helpers')

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

const createAgent = options => {
  const agent = new ALPNAgent(options)
  // Promisify the agent `createConnection` function from the Node API
  // so we can easily call it from our tests
  agent.promisifiedAgentCreate =
    util.promisify(agent.createConnection.bind(agent))
  return agent
}

test.beforeEach(t => {
  t.context.agent = createAgent({
    tlsSessionCache: new ALPNAgent.TLSSessionCache(),
    rejectUnauthorized: false
  })
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
].forEach(({ proto, alpn, sessionType, createFn }) => {
  test(`negotiates an ${proto} connection`, async t => {
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    expectTlsCacheStats(t, { hits: 0, misses: 1, evictions: 0 })
  })

  test(`${proto} session fails on an unresponsive host`, async t => {
    await t.throwsAsync(t.context.agent[createFn](FAILING_HOST))
  })

  test(`creates an ${proto} session with negotiation`, async t => {
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    const session = await t.context.agent[createFn](servers[proto])
    expectTlsCacheStats(t, { hits: 0, misses: 1, evictions: 0 })
    t.is(session.constructor.name, sessionType)
  })

  test(`creates an ${proto} session witout negotiation`, async t => {
    const session = await t.context.agent[createFn](servers[proto])
    t.is(session.constructor.name, sessionType)
  })

  test(`reuses cached TLS session info for ${proto}`, async t => {
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    expectTlsCacheStats(t, { hits: 0, misses: 1, evictions: 0 })
    t.context.agent.destroy()
    t.is(await t.context.agent.negotiateALPN(servers[proto]), alpn)
    expectTlsCacheStats(t, { hits: 1, misses: 1, evictions: 0 })
  })

  test(`evicts TLS session cache on ${proto} transmission error`, async t => {
    const session = await t.context.agent[createFn](servers[proto])
    expectTlsCacheStats(t, { hits: 0, misses: 1, evictions: 0 })
    const closed = new Promise((resolve, reject) => {
      session.once('close', resolve)
    })
    session.destroy(new Error('transmission error'))
    await closed
    expectTlsCacheStats(t, { hits: 0, misses: 1, evictions: 1 })
    await t.context.agent[createFn](servers[proto])
    expectTlsCacheStats(t, { hits: 0, misses: 2, evictions: 1 })
  })

  test(`handles no TLS session cache on ${proto} transmission error`, async t => {
    const agent = createAgent({
      tlsSessionCache: null,
      rejectUnauthorized: false
    })
    const session = await agent[createFn](servers[proto])
    const closed = new Promise((resolve, reject) => {
      session.once('close', resolve)
    })
    session.destroy(new Error('transmission error'))
    await closed
    await agent[createFn](servers[proto])
    await agent.destroy()
    t.pass()
  })
})

test('initializes with global TLS session cache by default', async t => {
  const agent = new ALPNAgent()
  t.is(agent.tlsSessionCache, ALPNAgent.TLSSessionCache.global)
  await agent.destroy()
})

test('initializes without TLS session cache', async t => {
  const agent = new ALPNAgent({ tlsSessionCache: null })
  t.is(agent.tlsSessionCache, null)
  await agent.destroy()
})

test(`ALPN negotiation fails on an unresponsive host`, async t => {
  await t.throwsAsync(t.context.agent.negotiateALPN(FAILING_HOST))
})

test('can perform an https request with agent', async t => {
  const { host, port, rejectUnauthorized } = servers.https
  const options = {
    agent: t.context.agent,
    host,
    port,
    rejectUnauthorized,
    path: '/200'
  }
  await h1request(t, options)
})

test('can perform an https request with agent after ALPN negotiation', async t => {
  const { host, port, rejectUnauthorized } = servers.https
  const options = {
    agent: t.context.agent,
    host,
    port,
    rejectUnauthorized,
    path: '/200'
  }
  t.is(await t.context.agent.negotiateALPN(options), 'http/1.1')
  await h1request(t, options)
})

test('reuses free H1 socket on subsequent requests', async t => {
  const { host, port, rejectUnauthorized } = servers.https
  const options = {
    agent: t.context.agent,
    host,
    port,
    rejectUnauthorized,
    path: '/200'
  }
  await h1request(t, options)
  expectH1Stats(t, { h1Hits: 0, h1Misses: 1 })
  await h1request(t, options)
  expectH1Stats(t, { h1Hits: 1, h1Misses: 1 })
})

test('can perform an h2 request', async t => {
  const session = await t.context.agent.createH2Session(servers.h2)
  await h2request(t, session)
})

test('can pass h2 connection settings', async t => {
  const settings = {
    enablePush: true,
    headerTableSize: 65536,
    maxConcurrentStreams: 1000,
    initialWindowSize: 6291456
  }
  const session = await t.context.agent.createH2Session(
    Object.assign({}, servers.h2, { settings })
  )
  if (session.pendingSettingsAck) {
    await new Promise((resolve, reject) => {
      session.once('localSettings', resolve)
    })
  }
  Object.keys(settings).forEach(
    key => t.is(session.localSettings[key], settings[key])
  )
})
