const test = require('ava')
const TLSSessionCache = require('../')

test.beforeEach(t => {
  t.context.cache = new TLSSessionCache()
})

test('counts misses', t => {
  t.is(t.context.cache.load('test'), null)
  t.is(t.context.cache.misses, 1)
})

test('counts hits', t => {
  const session = Buffer.from('hello world')
  t.context.cache.save('test', session)
  t.is(t.context.cache.load('test'), session)
  t.is(t.context.cache.hits, 1)
})

test('counts evictions', t => {
  const session = Buffer.from('hello world')
  t.context.cache.save('test', session)
  t.context.cache.evict('test')
  t.is(t.context.cache.evictions, 1)
  t.is(t.context.cache.load('test'), null)
})
