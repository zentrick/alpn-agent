const test = require('ava')
const getName = require('../../lib/h2/get-name')

const testMacro = (t, authority = t.title, options) => {
  t.snapshot(getName(authority, options))
  t.snapshot(getName(new URL(authority), options))
  t.is(getName(authority, options), getName(new URL(authority), options))
}

test('http://localhost:8080', testMacro)
test('http://localhost', testMacro)
test('https://localhost:8080', testMacro)
test('https://test:4343', testMacro)
