module.exports = (options) =>
  // NOTE: in this context, `host` and `hostname` have equivalent meanings, port
  // information is stored in the separate `port` field
  options.hostname ||
  options.host ||
  'localhost'
