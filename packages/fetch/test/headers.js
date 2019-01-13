const test = require('ava')
const { Headers } = require('../')

test('constructor accepts an existing Headers object', t => {
  const h1 = new Headers({ something: 'test' })
  const h2 = new Headers(h1)
  t.is(h2.get('something'), 'test')
})

test('constructor accepts a list of headers', t => {
  const h1 = new Headers([
    ['something', 'test']
  ])
  t.is(h1.get('something'), 'test')
})

test('constructor throws on invalid list of headers', t => {
  t.throws(() => new Headers([
    ['something']
  ]))
})

test('get returns null for non-existing header', t => {
  const h = new Headers({ other: 'test' })
  t.is(h.get('something'), null)
})

test('get returns value for existing header', t => {
  const h = new Headers({ something: 'test' })
  t.is(h.get('something'), 'test')
})

test('has returns false for non-existing header', t => {
  const h = new Headers()
  t.false(h.has('something'))
})

test('has returns true for existing header', t => {
  const h = new Headers({ something: 'test' })
  t.true(h.has('something'))
})

test('set replaces value for existing header', t => {
  const h = new Headers({ something: 'test' })
  h.set('something', 'value')
  t.is(h.get('something'), 'value')
})

test('set throws on invalid header name', t => {
  const h = new Headers()
  t.throws(() => h.set('[invalid]', 'test'))
})

test('set throws on invalid header value', t => {
  const h = new Headers()
  t.throws(() => h.set('something', 'te\0st'))
})

test('set normalizes header values', t => {
  const h = new Headers()
  h.set('something', '  test\t')
  t.is(h.get('something'), 'test')
})

test('append adds value to existing header', t => {
  const h = new Headers({ something: 'test' })
  h.append('something', 'value')
  t.is(h.get('something'), 'test, value')
})

test('append throws on invalid header name', t => {
  const h = new Headers()
  t.throws(() => h.append('[invalid]', 'test'))
})

test('append throws on invalid header value', t => {
  const h = new Headers()
  t.throws(() => h.append('something', 'te\0st'))
})

test('append normalizes header values', t => {
  const h = new Headers()
  h.append('something', '  test\t')
  t.is(h.get('something'), 'test')
})

test('delete removes an existing header', t => {
  const h = new Headers({ something: 'test' })
  h.delete('something')
  t.is(h.get('something'), null)
})

test('delete ignores non-existing header', t => {
  const h = new Headers({ other: 'test' })
  h.delete('something')
  t.is(h.get('something'), null)
})
