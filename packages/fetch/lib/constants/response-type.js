module.exports = {
  // Normal, same origin response, with all headers exposed except “Set-Cookie”
  // and “Set-Cookie2″.
  BASIC: 'basic',

  // Response was received from a valid cross-origin request. Certain headers
  // and the body may be accessed.
  CORS: 'cors',

  // Network error. No useful information describing the error is available. The
  // Response’s status is 0, headers are empty and immutable. This is the type
  // for a Response obtained from Response.error().
  ERROR: 'error',

  // Response for “no-cors” request to cross-origin resource. Severely
  // restricted.
  OPAQUE: 'opaque',

  // The fetch request was made with redirect: "manual". The Response's status
  // is 0, headers are empty, body is null and trailer is empty.
  OPAQUE_REDIRECT: 'opaqueredirect'
}
