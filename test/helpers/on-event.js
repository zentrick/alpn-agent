module.exports = (emitter, event) => new Promise((resolve, reject) => {
  emitter.once(event, resolve)
})
