const test = require('ava')
const SocketCache = require('../lib/socket-cache')

test.beforeEach(t => {
  t.context.cache = new SocketCache()
})

test('pop removes the last item', t => {
  t.context.cache.push('test', 'abc')
  t.context.cache.push('test2', 'abc')
  t.context.cache.push('test', 'def')
  t.is(t.context.cache.pop('test'), 'def')
  t.is(t.context.cache.pop('test'), 'abc')
  t.is(t.context.cache.pop('test'), undefined)
})

test('remove removes an item', t => {
  t.context.cache.push('test', 'abc')
  t.context.cache.push('test', 'def')
  t.context.cache.remove('test', 'abc')
  t.is(t.context.cache.pop('test'), 'def')
  t.is(t.context.cache.pop('test'), undefined)
})

test('remove is a noop if item does not exist', t => {
  t.is(t.context.cache.pop('test'), undefined)
  t.context.cache.remove('test', 'abc')
  t.is(t.context.cache.pop('test'), undefined)
})

test('remove is a noop if item no longer exists', t => {
  t.context.cache.push('test', 'abc')
  t.is(t.context.cache.pop('test'), 'abc')
  t.is(t.context.cache.pop('test'), undefined)
  t.context.cache.remove('test', 'abc')
  t.is(t.context.cache.pop('test'), undefined)
})

test('has checks for the existence of items', t => {
  t.context.cache.push('test', 'abc')
  t.context.cache.push('test2', 'def')
  t.context.cache.pop('test')
  t.false(t.context.cache.has('test'))
  t.true(t.context.cache.has('test2'))
})

test('peek returns an item without removing it', t => {
  t.context.cache.push('test', 'abc')
  t.is(t.context.cache.peek('test'), 'abc')
  t.is(t.context.cache.pop('test'), 'abc')
  t.is(t.context.cache.pop('test'), undefined)
})
