module.exports = (options, key, defaultValue) => {
  if (typeof options[key] === 'undefined') {
    options[key] = defaultValue
  }
}
