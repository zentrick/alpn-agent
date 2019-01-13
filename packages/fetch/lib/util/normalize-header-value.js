const RE_NORMALIZE = /^[\t\x20\r\f]*|[\t\x20\r\f]*$/g

// https://fetch.spec.whatwg.org/#concept-header-value-normalize
module.exports = potentialValue => potentialValue.replace(RE_NORMALIZE, '')
