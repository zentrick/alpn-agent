const test = require('ava')
const isHeaderValue = require('../../lib/util/is-header-value')

;[
  '',
  't',
  'test'
].forEach(validCase => {
  test(`accepts "${validCase}"`, t => {
    t.true(isHeaderValue(validCase))
  })
})

;[
  'test ',
  ' test',
  ' test ',
  'test\t',
  'te\x00st'
].forEach(invalidCase => {
  test(`rejects "${invalidCase}"`, t => {
    t.false(isHeaderValue(invalidCase))
  })
})
