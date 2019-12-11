const soap = require('soap');
const get = require('lodash.get');
const config = require('./config');
const {
  invoke,
  prefix,
  getError,
  getResponse,
} = require('./helpers');
const WSDLValidator = require('./validate');

class PurolatorServices {
  constructor(key, password) {
    this.version = 2;
    this.namespace = 'ns1';
    this.authToken = new soap.BasicAuthSecurity(
      key,
      password,
    );
  }

  static async sanitizeSoapRequest(name, method, body) {
    const validationAdapter = new WSDLValidator(name);
    await validationAdapter.build();

    const schema = validationAdapter.get(method);
    const errors = WSDLValidator.run(schema, body);

    if (Object.keys(errors).length) {
      const err = new Error('Validation failed');
      err.errors = errors;
      throw err;
    }
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
    const ns1 = `${config.datatypes}/v${this.version}`;
    const headers = prefix(
      {
        RequestContext: {
          Version: `${this.version}.0`,
          Language: 'en',
          GroupID: 'xxx',
          RequestReference: this.constructor.name,
        },
      },
      this.namespace,
    );

    e.wsdl.definitions.xmlns.ns1 = ns1;
    e.wsdl.xmlnsInEnvelope = e.wsdl._xmlnsMap();
    e.setSecurity(this.authToken);
    e.addSoapHeader(headers);
    return e;
  }

  async $req(serviceName, body) {
    const payload = prefix(body, this.namespace);
    const name = config.getWSDL(serviceName.split('.')[0]);

    const { method, responseKey } = get(
      config.responses,
      serviceName,
    );

    const params = {
      returnFault: true,
      envelopeKey: 'SOAP-ENV',
      xmlKey: this.namespace,
      overrideRootElement: {
        namespace: this.namespace,
      },
    };

    await PurolatorServices.sanitizeSoapRequest(
      name,
      method,
      body,
    );

    return soap
      .createClientAsync(name, params)
      .then(this.$appendHeaders.bind(this))
      .then(invoke(`${method}Async`, payload))
      .then(getResponse(responseKey))
      .catch(getError);
  }
}

module.exports = PurolatorServices;
