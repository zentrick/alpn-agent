const defaultFilter = () => true

const forwardEvent = (evt, to, filter) => (...args) => {
  if (filter(evt, ...args) !== false) {
    to.emit(evt, ...args)
  }
}

module.exports = (from, to, events, filter = defaultFilter) => {
  for (const evt of events) {
    from.on(evt, forwardEvent(evt, to, filter))
  }
}
