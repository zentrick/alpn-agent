const test = require('ava')
const Pool = require('@zentrick/h2-pool')
const { connect: alpnConnect } = require('@zentrick/h2-alpn')
const {
  Servers,
  createTestPaths,
  h2request
} = require('./helpers')

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
})
