const test = require('ava')
const H2Pool = require('../')
const {
  Servers,
  createTestPaths,
  h2request,
  onEvent
} = require('../../../test/helpers')

let servers

const getFirstOrigin = pool => [...pool.origins.values()][0]
const expectOriginStats = (t, pool, expectation) => {
  const { sessions, idleSessions } = getFirstOrigin(pool)
  t.deepEqual({ sessions, idleSessions }, expectation)
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
  t.context.pool = new H2Pool({
    keepAlive: true,
    rejectUnauthorized: false
  })
})

test.afterEach.always(async t => {
  if (t.context.pool != null) {
    await t.context.pool.destroy()
    t.context.pool = null
  }
})

test('creates a new session', async t => {
  const session = await t.context.pool.connect(servers.h2.url)
  t.truthy(session)
  t.is(t.context.pool.origins.size, 1)
})

test('allocates the same session multiple times', async t => {
  const session1 = await t.context.pool.connect(servers.h2.url)
  const session2 = await t.context.pool.connect(servers.h2.url)
  t.is(session1, session2)
})

test('failed connect attempts are not stored', async t => {
  const session = await t.context.pool.connect(servers.https.url)
  await t.throwsAsync(new Promise((resolve, reject) => {
    session.once('error', reject)
  }))
})

test('can perform an h2 request', async t => {
  const session = await t.context.pool.connect(servers.h2.url)
  await h2request(t, session)
})

test('can perform an h2 request without TLS session cache', async t => {
  const pool = new H2Pool({
    keepAlive: true,
    tlsSessionCache: null,
    rejectUnauthorized: false
  })
  const session = await pool.connect(servers.h2.url)
  await h2request(t, session)
  await pool.destroy()
})

test('opens a new session when the old one is saturated', async t => {
  const pool = new H2Pool({
    keepAlive: true,
    peerMaxConcurrentStreams: 1,
    rejectUnauthorized: false
  })
  const session1 = await pool.connect(servers.h2.url)
  const req = h2request(t, session1)
  await onEvent(session1, 'connect')
  const session2 = await pool.connect(servers.h2.url)
  t.not(session1, session2)
  await req
  await pool.destroy()
})

test('queues a request when all sessions are saturated', async t => {
  const pool = new H2Pool({
    keepAlive: true,
    maxSessions: 1,
    peerMaxConcurrentStreams: 1,
    rejectUnauthorized: false
  })
  const session1 = await pool.connect(servers.h2.url)
  const req = h2request(t, session1)
  await onEvent(session1, 'connect')
  const session2 = await pool.connect(servers.h2.url)
  t.is(session1, session2)
  await req
  await pool.destroy()
})

test('revives idle sessions', async t => {
  const session1 = await t.context.pool.connect(servers.h2.url)
  expectOriginStats(t, t.context.pool, { sessions: 1, idleSessions: 0 })
  await h2request(t, session1)
  expectOriginStats(t, t.context.pool, { sessions: 1, idleSessions: 1 })
  const session2 = await t.context.pool.connect(servers.h2.url)
  expectOriginStats(t, t.context.pool, { sessions: 1, idleSessions: 0 })
  t.is(session1, session2)
})

test('closes idle sessions when keepAlive is false', async t => {
  const pool = new H2Pool({
    rejectUnauthorized: false
  })
  const session1 = await pool.connect(servers.h2.url)
  expectOriginStats(t, pool, { sessions: 1, idleSessions: 0 })
  await h2request(t, session1)
  expectOriginStats(t, pool, { sessions: 0, idleSessions: 0 })
  const session2 = await pool.connect(servers.h2.url)
  expectOriginStats(t, pool, { sessions: 1, idleSessions: 0 })
  t.not(session1, session2)
  await pool.destroy()
})

test('closes idle sessions when maxFreeSessions is 0', async t => {
  const pool = new H2Pool({
    keepAlive: true,
    maxFreeSessions: 0,
    rejectUnauthorized: false
  })
  const session1 = await pool.connect(servers.h2.url)
  expectOriginStats(t, pool, { sessions: 1, idleSessions: 0 })
  await h2request(t, session1)
  expectOriginStats(t, pool, { sessions: 0, idleSessions: 0 })
  const session2 = await pool.connect(servers.h2.url)
  expectOriginStats(t, pool, { sessions: 1, idleSessions: 0 })
  t.not(session1, session2)
  await pool.destroy()
})

test('evicts oldest idle sessions when maxFreeSessions is reached', async t => {
  const pool = new H2Pool({
    keepAlive: true,
    maxFreeSessions: 1,
    rejectUnauthorized: false
  })
  const session1 = await pool.connect(servers.h2.url)
  expectOriginStats(t, pool, { sessions: 1, idleSessions: 0 })
  await h2request(t, session1)
  expectOriginStats(t, pool, { sessions: 0, idleSessions: 1 })
  const session2 = await pool.connect(servers.h2.url)
  expectOriginStats(t, pool, { sessions: 1, idleSessions: 0 })
  t.not(session1, session2)
  await pool.destroy()
})
