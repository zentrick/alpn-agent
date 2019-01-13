const test = require('ava')
const { Headers } = require('../')

test('constructor accepts an existing Headers object', t => {
  const h1 = new Headers({ something: 'test' })
  const h2 = new Headers(h1)
  t.is(h2.get('something'), 'test')
})

test('get returns null for non-existing header', t => {
  const h = new Headers()
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

test('append adds value to existing header', t => {
  const h = new Headers({ something: 'test' })
  h.append('something', 'value')
  t.is(h.get('something'), 'test, value')
})
