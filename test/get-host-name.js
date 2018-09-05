const test = require('ava')
const getHostName = require('../lib/get-host-name')

test('prefers given hostname', t => {
  t.is(getHostName({
    hostname: 'abc',
    host: 'def'
  }), 'abc')
})

test('falls back to host', t => {
  t.is(getHostName({
    host: 'def'
  }), 'def')
})

test('falls back to localhost', t => {
  t.is(getHostName({
    host: null
  }), 'localhost')
})
