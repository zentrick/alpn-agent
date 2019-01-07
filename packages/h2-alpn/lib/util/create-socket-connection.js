module.exports = (socket, isConnected) => (opts, cb) => {
  if (cb != null) {
    if (isConnected(socket)) {
      process.nextTick(cb)
    } else {
      socket.on('connect', cb)
    }
  }
  return socket
}
