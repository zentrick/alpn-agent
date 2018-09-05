const createHttpsServer = require('./server-https')
const createHttpServer = require('./server-http')
const createH2Server = require('./server-h2')

const serverFactories = {
  http: createHttpServer,
  https: createHttpsServer,
  h2: createH2Server
}

const _protos = Symbol('protocols')
const _servers = Symbol('servers')
const _opts = Symbol('options')
const _portFn = Symbol('portFunction')

module.exports = class Servers {
  constructor (protos = ['http', 'https', 'h2'], opts = null, portFn = null) {
    this[_protos] = protos
    this[_servers] = null
    this[_opts] = opts
    this[_portFn] = portFn
  }

  async start () {
    this[_servers] = {}
    await Promise.all(
      this[_protos].map(async (proto) => {
        if (!(proto in serverFactories)) {
          throw new Error(`Unknown protocol ${proto}`)
        }
        const port = this[_portFn] != null
          ? this[_portFn]()
          : null
        const server = await serverFactories[proto](this[_opts], port)
        await server.listen()
        this[_servers][proto] = server
      })
    )
  }

  async stop () {
    if (this[_servers] == null) {
      return
    }
    await Promise.all(this.servers.map(server => server.close()))
    this[_servers] = null
  }

  get protos () {
    return this[_protos]
  }

  get started () {
    return this[_servers] != null
  }

  get servers () {
    return Object.values(this[_servers])
  }

  get http () {
    return this[_servers].http
  }

  get https () {
    return this[_servers].https
  }

  get h2 () {
    return this[_servers].h2
  }

  on (...args) {
    this.servers.forEach(server => server.on(...args))
  }
}
