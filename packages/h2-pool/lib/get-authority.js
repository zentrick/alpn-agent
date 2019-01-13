module.exports = url => {
  url = typeof url === 'string' ? new URL(url) : url
  return url.origin
}
