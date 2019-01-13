const test = require('ava')
const { Request, Headers } = require('../')

test('has default cache value', t => {
  const r = new Request('about:blank')
  t.is(r.cache, 'default')
})

test('has default credentials value', t => {
  const r = new Request('about:blank')
  t.is(r.credentials, 'same-origin')
})

test('has default destination value', t => {
  const r = new Request('about:blank')
  t.is(r.destination, '')
})

test('has default headers', t => {
  const r = new Request('about:blank')
  t.true(r.headers instanceof Headers)
})

test('has default integrity value', t => {
  const r = new Request('about:blank')
  t.is(r.integrity, '')
})

test('has default method value', t => {
  const r = new Request('about:blank')
  t.is(r.method, 'GET')
})

test('has default mode value', t => {
  const r = new Request('about:blank')
  t.is(r.mode, 'cors')
})

test('has default redirect value', t => {
  const r = new Request('about:blank')
  t.is(r.redirect, 'follow')
})

test('has default referrer value', t => {
  const r = new Request('about:blank')
  t.is(r.referrer, '')
})

test('has empty referrerPolicy', t => {
  const r = new Request('about:blank')
  t.is(r.referrerPolicy, '')
})

test('has empty signal', t => {
  const r = new Request('about:blank')
  t.is(r.signal, null)
})

test('can clone a request', t => {
  const r = new Request('about:blank')
  const r2 = r.clone()
  t.true(r2 instanceof Request)
  t.is(r2.url, r.url)
})
