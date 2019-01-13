module.exports = {
  // Never send cookies.
  OMIT: 'omit',
  // Send user credentials (cookies, basic http auth, etc..) if the URL is on
  // the same origin as the calling script. This is the default value.
  SAME_ORIGIN: 'same-origin',
  // Always send user credentials (cookies, basic http auth, etc..), even for
  // cross-origin calls.
  INCLUDE: 'include'
}
