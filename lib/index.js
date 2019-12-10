const soap = require('soap');
const get = require('lodash.get');
const config = require('./config');
const responses = require('./responses');

module.exports = class PurolatorServices {
  constructor(key, password) {
    this.headers = new soap.BasicAuthSecurity(
      key,
      password,
    );
  }

  async getAvailabilityOptions(body) {
    return this.$req('ServiceAvailability.Options', body);
  }

  async validatePostalCode(body) {
    return this.$req('ServiceAvailability.Validate', body);
  }

  async estimate(body, options = {}) {
    const { full = false, ids = [] } = options;
    const ShipmentEstimate = await this.$req(
      `Estimating.${full ? 'Full' : 'Quick'}`,
      body,
    );

    return !Array.isArray(ids) || !ids.length
      ? ShipmentEstimate
      : ShipmentEstimate.filter(({ ServiceID }) =>
          ids.includes(ServiceID),
        );
  }

  $appendHeaders(e) {
    const ns1 = 'http://purolator.com/pws/datatypes/v2';

    e.wsdl.definitions.xmlns.ns1 = ns1;
    e.wsdl.xmlnsInEnvelope = e.wsdl._xmlnsMap();
    e.setSecurity(this.headers);
    e.addSoapHeader(
      config.ensureNameSpace({
        RequestContext: {
          Version: '2.0',
          Language: 'en',
          GroupID: 'xxx',
          RequestReference: this.constructor.name,
        },
      }),
    );

    return e;
  }

  async $req(serviceName, body) {
    const payload = config.ensureNameSpace(body);
    const name = config.getWSDL(serviceName.split('.')[0]);
    const { method, responseKey } = get(
      responses,
      serviceName,
    );

    return soap
      .createClientAsync(name, {
        returnFault: true,
        suppressStack: false,
        envelopeKey: 'SOAP-ENV',
        xmlKey: 'ns1',
        overrideRootElement: {
          namespace: 'ns1',
        },
      })
      .then((e) => this.$appendHeaders(e)[method](payload))
      .then(config.onResponse(responseKey))
      .catch(config.onError);
  }
};
