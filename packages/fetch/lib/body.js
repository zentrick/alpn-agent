const _body = Symbol('body')
const _disturbed = Symbol('disturbed')
// const debug = require('debug')

// const DEBUG = debug('h2::fetch::body')

class Body {
  constructor (body = null) {
    this[_body] = body
    this[_disturbed] = false
  }

  get body () {
    return this[_body]
  }

  get bodyUsed () {
    return this[_disturbed]
  }

  async arrayBuffer () {
    if (this[_disturbed]) {
      return Buffer.alloc(0)
    }
    this[_disturbed] = true
    return new Promise((resolve, reject) => {
      const chunks = []
      this[_body].on('data', chunk => {
        chunks.push(chunk)
      })
      this[_body].on('end', () => {
        resolve(Buffer.concat(chunks))
      })
      this[_body].on('error', reject)
    })
  }

  async blob () {
    throw new Error('Not implemented')
  }

  async formData () {
    throw new Error('Not implemented')
  }

  async json () {
    if (this[_disturbed]) {
      return null
    }
    const data = await this.arrayBuffer()
    return JSON.parse(data)
  }

  async text () {
    if (this[_disturbed]) {
      return ''
    }
    const data = await this.arrayBuffer()
    return data.toString('utf8')
  }
}

module.exports = Body
