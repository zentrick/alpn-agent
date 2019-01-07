const test = require('ava')
const defer = require('p-defer')
const {
  Servers,
  createTestPaths,
  h2request
} = require('../../../test/helpers')
const { connect } = require('../')

const PROTOS = ['h2', 'https', 'http']

const closeSession = session =>
  new Promise((resolve, reject) => session.close(resolve))

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

PROTOS.forEach(proto => {
  test(`makes an ${proto} session from string authority`, async t => {
    const { url } = servers[proto]
    const connected = defer()
    t.context.session = connect(url, {
      rejectUnauthorized: false
    }, connected.resolve)
    t.truthy(t.context.session)
    t.is(t.context.session.connecting, true)
    await t.notThrowsAsync(connected.promise)
    t.is(t.context.session.connecting, false)
  })

  test(`makes an ${proto} session from URL authority`, async t => {
    const { url } = servers[proto]
    const connected = defer()
    t.context.session = connect(new URL(url), {
      rejectUnauthorized: false
    }, connected.resolve)
    t.truthy(t.context.session)
    await t.notThrowsAsync(connected.promise)
  })

  test(`closes an ${proto} session before connected`, async t => {
    const { url } = servers[proto]
    const connected = defer()
    t.context.session = connect(url, {
      rejectUnauthorized: false
    }, connected.resolve)
    t.truthy(t.context.session)
    t.is(t.context.session.connecting, true)
    t.is(t.context.session.closed, false)
    await t.notThrowsAsync(closeSession(t.context.session))
    t.is(t.context.session.closed, true)
  })

  if (proto !== 'http') {
    test(`makes an ${proto} session without TLS session cache`, async t => {
      const { url } = servers[proto]
      const connected = defer()
      t.context.session = connect(url, {
        rejectUnauthorized: false,
        tlsSessionCache: null
      }, connected.resolve)
      t.truthy(t.context.session)
      await t.notThrowsAsync(connected.promise)
    })

    test(`makes an ${proto} session with specific ALPN`, async t => {
      const alpn = {
        'http': 'h2c',
        'https': 'http/1.1',
        'h2': 'h2'
      }[proto]
      const { url } = servers[proto]
      const connected = defer()
      t.context.session = connect(url, {
        rejectUnauthorized: false,
        ALPNProtocols: [alpn]
      }, connected.resolve)
      t.context.session.on('error', connected.reject)
      t.truthy(t.context.session)
      await t.notThrowsAsync(connected.promise)
      t.is(t.context.session.alpnProtocol, alpn)
    })

    test(`fails an ${proto} session with specific, invalid ALPN`, async t => {
      const { url } = servers[proto]
      const connected = defer()
      t.context.session = connect(url, {
        rejectUnauthorized: false,
        ALPNProtocols: ['invalid']
      }, connected.resolve)
      t.context.session.on('error', connected.reject)
      t.truthy(t.context.session)
      await t.throwsAsync(connected.promise)
    })
  }

  test(`makes an ${proto} request`, async t => {
    const { url } = servers[proto]
    t.context.session = connect(url, {
      rejectUnauthorized: false
    })
    await h2request(t, t.context.session)
  })

  test(`makes parallel ${proto} requests`, async t => {
    const { url } = servers[proto]
    t.context.session = connect(url, {
      rejectUnauthorized: false
    })
    await Promise.all([
      h2request(t, t.context.session),
      h2request(t, t.context.session),
      h2request(t, t.context.session)
    ])
  })

  test(`makes an ${proto} POST request`, async t => {
    const { url } = servers[proto]
    t.context.session = connect(url, {
      rejectUnauthorized: false
    })
    await h2request(t, t.context.session, 'echo-body')
  })

  test(`makes an ${proto} request with custom headers`, async t => {
    const { url } = servers[proto]
    t.context.session = connect(url, {
      rejectUnauthorized: false
    })
    await h2request(t, t.context.session, 'custom-header')
  })

  test(`fails an ${proto} session to an invalid host`, async t => {
    const { protocol } = servers[proto]
    const connected = defer()
    t.context.session = connect(`${protocol}//undefined:3123`, {
      rejectUnauthorized: false
    }, connected.resolve)
    t.context.session.on('error', connected.reject)
    t.truthy(t.context.session)
    await t.throwsAsync(connected.promise)
  })
})
