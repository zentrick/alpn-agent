const RE_HEADER_VALUE = /^$|^[^\0\t\x20\r\f](?:[^\0\r\f]*[^\0\t\x20\r\f])?$/

module.exports = value => RE_HEADER_VALUE.test(value)
