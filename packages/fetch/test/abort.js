const test = require('ava')
const AbortController = require('../lib/abort')

test('has a signal', t => {
  const a = new AbortController()
  t.truthy(a.signal)
})

test('signal is not aborted by default', t => {
  const a = new AbortController()
  t.false(a.signal.aborted)
})

test('aborts the signal', t => {
  const a = new AbortController()
  a.abort()
  t.true(a.signal.aborted)
})

test('fires an abort event', t => {
  const a = new AbortController()
  let fired = false
  a.signal.on('abort', () => {
    fired = true
  })
  a.abort()
  t.true(fired)
})

test('fires algorithms on abort', t => {
  const a = new AbortController()
  let fired = false
  a.signal.add(() => {
    fired = true
  })
  a.abort()
  t.true(fired)
})

test('can remove an algorithm', t => {
  const a = new AbortController()
  let fired = false
  const algo = () => {
    fired = true
  }
  a.signal.add(algo)
  a.signal.remove(algo)
  a.abort()
  t.false(fired)
})

test('ignores remove on an unknown algorithm', t => {
  const a = new AbortController()
  let fired = false
  a.signal.remove(() => {
    fired = true
  })
  a.abort()
  t.false(fired)
})

test('does not fire algorithms after first abort', t => {
  const a = new AbortController()
  a.abort()
  let fired = false
  a.signal.add(() => {
    fired = true
  })
  a.abort()
  t.false(fired)
})

test('can follow a parent signal', t => {
  const parent = new AbortController()
  const child = new AbortController()
  let fired = false
  child.signal.add(() => {
    fired = true
  })
  child.signal.follow(parent.signal)
  parent.abort()
  t.true(child.signal.aborted)
  t.true(fired)
})

test('can follow a parent signal that was already aborted', t => {
  const parent = new AbortController()
  parent.abort()
  const child = new AbortController()
  let fired = false
  child.signal.add(() => {
    fired = true
  })
  child.signal.follow(parent.signal)
  t.true(child.signal.aborted)
  t.true(fired)
})

test('ignores follow when already aborted', t => {
  const parent = new AbortController()
  const child = new AbortController()
  child.abort()
  let fired = false
  child.signal.on('abort', () => {
    fired = true
  })
  child.signal.follow(parent.signal)
  parent.abort()
  t.false(fired)
})
