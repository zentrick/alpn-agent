const RE_NORMALIZE = /^[\x9\x20\xA\xD]|[\x9\x20\xA\xD]*$/

// https://fetch.spec.whatwg.org/#concept-header-value-normalize
module.exports = potentialValue => potentialValue.replace(RE_NORMALIZE, '')
