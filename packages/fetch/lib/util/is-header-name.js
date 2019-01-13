// https://tools.ietf.org/html/rfc7230#section-3.2.6
const RE_HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

module.exports = name => RE_HEADER_NAME.test(name)
