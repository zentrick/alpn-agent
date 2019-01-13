const test = require('ava')
const { fetch } = require('../')
const {
  Servers,
  createTestPaths
} = require('../../../test/helpers')
const AbortController = require('../lib/abort')

const PROTOCOLS = ['h2', 'https', 'http']
let servers

test.before(async t => {
  servers = new Servers(PROTOCOLS)
  await servers.start()
  createTestPaths(servers)
})

test.after.always(async t => {
  servers.stop()
  servers = null
})

PROTOCOLS.forEach(proto => {
  test(`can perform a ${proto} fetch`, async t => {
    const fetching = fetch(`${servers[proto].url}/200`, {
      rejectUnauthorized: false
    })
    await t.notThrowsAsync(fetching)
    const response = await fetching
    t.is(response.status, 200)
    t.is(response.statusText, '')
    t.true(response.ok)
    t.false(response.redirected)
    t.true(response.headers.has('date'))
    t.is(response.type, 'basic')
    const getting = response.text()
    await t.notThrowsAsync(getting)
    const text = await getting
    t.is(text, 'OK')
  })

  test(`fails on an invalid ${proto} fetch`, async t => {
    await t.throwsAsync(fetch(`${servers[proto].url}INVALID/200`, {
      rejectUnauthorized: false
    }))
  })

  test(`can abort a ${proto} fetch`, async t => {
    const abort = new AbortController()
    const fetching = fetch(`${servers[proto].url}/200`, {
      signal: abort.signal,
      rejectUnauthorized: false
    })
    abort.abort()
    await t.throwsAsync(fetching)
  })

  test(`aborts a ${proto} fetch when provided with an aborted signal`, async t => {
    const abort = new AbortController()
    abort.abort()
    const fetching = fetch(`${servers[proto].url}/200`, {
      signal: abort.signal,
      rejectUnauthorized: false
    })
    await t.throwsAsync(fetching)
  })
})
