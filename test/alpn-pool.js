const test = require('ava')
const Pool = require('@zentrick/h2-pool')
const { connect: alpnConnect } = require('@zentrick/h2-alpn')
const {
  Servers,
  createTestPaths,
  h2request
} = require('./helpers')
const { extend: gotExtend } = require('got')
const h2wrapper = require('http2-wrapper')

const getAuthority = ({ protocol, host, port }) =>
  `${protocol}//${host}`

const createGot = pool => gotExtend({
  hooks: {
    beforeRequest: [
      async options => {
        options.session = pool.connect(getAuthority(options), options)
        // HACK: otherwise http2-wrapper rejects our request
        options.protocol = 'https:'
        options.request = h2wrapper.request
      }
    ]
  }
})

const PROTOS = ['h2', 'https', 'http']

let servers

test.before(async t => {
  servers = new Servers(PROTOS)
  await servers.start()
  console.log('Test servers up at')
  PROTOS.forEach(proto => console.log(`  - ${proto.padEnd(10)} ${servers[proto].url}`))
  console.log()
  createTestPaths(servers)
})

test.after.always(async t => {
  servers.stop()
  servers = null
})

test.beforeEach(t => {
  t.context.pool = new Pool({
    keepAlive: true,
    rejectUnauthorized: false,
    createSession: alpnConnect
  })
})

test.afterEach.always(async t => {
  const { pool } = t.context
  if (pool != null) {
    pool.destroy()
  }
})

PROTOS.forEach(proto => {
  test(`can make an ${proto} request`, async t => {
    const session = t.context.pool.connect(servers[proto].url)
    await h2request(t, session)
  })

  test.only(`can make an ${proto} request through got`, async t => {
    const got = createGot(t.context.pool)
    const req = got(`${servers[proto].url}/200`)
    await t.notThrowsAsync(req)
  })
})
