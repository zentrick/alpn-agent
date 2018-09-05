const pem = require('pem')
const {promisify} = require('util')

const pemCreateCertificate = promisify(pem.createCertificate)

const DURATION = 500
const NAME = 'test.com'

const createCertificate = async () => {
  const rootCert = await pemCreateCertificate({
    days: DURATION,
    selfSigned: true
  })
  const {clientKey, certificate} = await pemCreateCertificate({
    serviceCertificate: rootCert.certificate,
    serviceKey: rootCert.serviceKey,
    serial: Date.now(),
    days: DURATION,
    country: '',
    state: '',
    locality: '',
    organization: '',
    organizationUnit: '',
    commonName: NAME
  })
  return {
    key: clientKey,
    cert: certificate,
    rejectUnauthorized: false
  }
}

module.exports = createCertificate()
