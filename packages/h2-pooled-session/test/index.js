const test = require('ava')
const defer = require('p-defer')
const http2 = require('http2')
const {
  Servers,
  createTestPaths,
  h2request
} = require('../../../test/helpers')
const { connect } = require('../')

const PROTOS = ['h2']

const closeSession = session =>
  new Promise((resolve, reject) => session.close(resolve))

const expectSessions = (t, active, idle) => {
  const { session } = t.context
  t.is(session.activeSessionCount, active)
  t.is(session.idleSessionCount, idle)
  t.is(session.sessionCount, active + idle)
}

let servers

test.before(async t => {
  servers = new Servers(PROTOS)
  await servers.start()
  createTestPaths(servers)
})

test.after.always(async t => {
  servers.stop()
  servers = null
})

test.afterEach.always(async t => {
  const { session } = t.context
  if (session != null && !session.closed) {
    await closeSession(session)
  }
})

test('connects', async t => {
  const connected = defer()
  t.context.session = connect(servers.h2.url, {
    rejectUnauthorized: false,
    keepAlive: true
  }, connected.resolve)
  t.truthy(t.context.session)
  t.is(t.context.session.connecting, true)
  t.is(t.context.session.alpnProtocol, undefined)
  expectSessions(t, 1, 0)
  await t.notThrowsAsync(connected.promise)
  t.is(t.context.session.connecting, false)
  t.is(t.context.session.alpnProtocol, 'h2')
  expectSessions(t, 0, 1)
})

test('connects with createSession', async t => {
  const connected = defer()
  let called = false
  t.context.session = connect(servers.h2.url, {
    rejectUnauthorized: false,
    keepAlive: true,
    createSession: (...args) => {
      called = true
      return http2.connect(...args)
    }
  }, connected.resolve)
  t.truthy(t.context.session)
  t.is(t.context.session.connecting, true)
  await t.notThrowsAsync(connected.promise)
  t.is(called, true)
  t.is(t.context.session.connecting, false)
})

test('evicts an idle session', async t => {
  const connected = defer()
  t.context.session = connect(servers.h2.url, {
    rejectUnauthorized: false,
    keepAlive: true
  }, connected.resolve)
  t.false(t.context.session.evictIdle())
  expectSessions(t, 1, 0)
  await t.notThrowsAsync(connected.promise)
  expectSessions(t, 0, 1)
  t.true(t.context.session.evictIdle())
  expectSessions(t, 0, 0)
  t.false(t.context.session.evictIdle())
  expectSessions(t, 0, 0)
})

test('performs a request', async t => {
  t.context.session = connect(servers.h2.url, {
    rejectUnauthorized: false,
    keepAlive: true
  })
  await h2request(t, t.context.session)
  expectSessions(t, 0, 1)
})

test('performs simultaneous requests', async t => {
  t.context.session = connect(servers.h2.url, {
    rejectUnauthorized: false,
    keepAlive: true
  })
  await Promise.all([
    h2request(t, t.context.session),
    h2request(t, t.context.session),
    h2request(t, t.context.session)
  ])
  expectSessions(t, 0, 1)
})

test('opens more sessions when maxConcurrentStreams reached', async t => {
  const connected = defer()
  t.context.session = connect(servers.h2.url, {
    rejectUnauthorized: false,
    peerMaxConcurrentStreams: 1,
    keepAlive: true
  }, connected.resolve)
  await t.notThrowsAsync(connected.promise)
  await Promise.all([
    h2request(t, t.context.session),
    h2request(t, t.context.session),
    h2request(t, t.context.session)
  ])
  expectSessions(t, 0, 3)
})

test('does not open more than maxSessions', async t => {
  const connected = defer()
  t.context.session = connect(servers.h2.url, {
    rejectUnauthorized: false,
    peerMaxConcurrentStreams: 1,
    maxSessions: 1,
    keepAlive: true
  }, connected.resolve)
  await t.notThrowsAsync(connected.promise)
  await Promise.all([
    h2request(t, t.context.session),
    h2request(t, t.context.session),
    h2request(t, t.context.session)
  ])
  expectSessions(t, 0, 1)
})

test('does not keep idle sessions alive with keepAlive = false', async t => {
  const connected = defer()
  t.context.session = connect(servers.h2.url, {
    rejectUnauthorized: false,
    keepAlive: false
  }, connected.resolve)
  await h2request(t, t.context.session)
  expectSessions(t, 0, 0)
})
