module.exports = session => new Promise((resolve, reject) => {
  session.close(resolve)
})
