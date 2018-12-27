module.exports = (name, session, cache) => {
  session.once('connect', (session, socket) => {
    cache.save(name, socket.getSession())
  })
  session.once('error', () => {
    // Evict TLS session cache when we closed due to a transmission error
    cache.evict(name)
  })
}
