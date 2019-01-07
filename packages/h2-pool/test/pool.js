const test = require('ava')
const H2Pool = require('../')
const {
  Servers,
  createTestPaths,
  h2request
} = require('../../../test/helpers')

let servers

const getFirstOrigin = pool => [...pool.origins.values()][0]
const expectOriginStats = (t, pool, active, idle) => {
  const origin = getFirstOrigin(pool)
  const {
    activeSessionCount,
    idleSessionCount,
    sessionCount
  } = origin || { activeSessionCount: 0, idleSessionCount: 0, sessionCount: 0 }
  t.is(activeSessionCount, active)
  t.is(idleSessionCount, idle)
  t.is(sessionCount, active + idle)
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
  const session = t.context.pool.connect(servers.h2.url)
  t.truthy(session)
  t.is(t.context.pool.origins.size, 1)
})

test('allocates the same session multiple times', async t => {
  const session1 = t.context.pool.connect(servers.h2.url)
  const session2 = t.context.pool.connect(servers.h2.url)
  t.is(session1, session2)
})

test('throws when connection fails', async t => {
  const session = t.context.pool.connect(servers.https.url)
  await t.throwsAsync(new Promise((resolve, reject) => {
    session.once('error', reject)
  }))
})

test('can perform an h2 request', async t => {
  const session = t.context.pool.connect(servers.h2.url)
  await h2request(t, session)
})

test('revives idle sessions', async t => {
  const session1 = t.context.pool.connect(servers.h2.url)
  expectOriginStats(t, t.context.pool, 1, 0)
  await h2request(t, session1)
  expectOriginStats(t, t.context.pool, 0, 1)
  const session2 = t.context.pool.connect(servers.h2.url)
  expectOriginStats(t, t.context.pool, 0, 1)
  t.is(session1, session2)
})

test('closes idle sessions when keepAlive is false', async t => {
  const pool = new H2Pool({
    rejectUnauthorized: false
  })
  const session1 = pool.connect(servers.h2.url)
  expectOriginStats(t, pool, 1, 0)
  await h2request(t, session1)
  expectOriginStats(t, pool, 0, 0)
  const session2 = pool.connect(servers.h2.url)
  expectOriginStats(t, pool, 1, 0)
  t.not(session1, session2)
  await pool.destroy()
})

test('closes idle sessions when maxFreeSessions is 0', async t => {
  const pool = new H2Pool({
    keepAlive: true,
    maxFreeSessions: 0,
    rejectUnauthorized: false
  })
  const session1 = pool.connect(servers.h2.url)
  expectOriginStats(t, pool, 1, 0)
  await h2request(t, session1)
  expectOriginStats(t, pool, 0, 0)
  const session2 = pool.connect(servers.h2.url)
  expectOriginStats(t, pool, 1, 0)
  t.not(session1, session2)
  await pool.destroy()
})

test.todo('evicts oldest idle sessions when maxFreeSessions is reached')
