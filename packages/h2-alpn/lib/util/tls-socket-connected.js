const isSocketConnected = require('./socket-connected')

module.exports = socket =>
  isSocketConnected(socket) && socket._secureEstablished
