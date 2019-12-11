const path = require('path');

exports.datatypes = 'http://purolator.com/pws/datatypes';

exports.responses = {
  Estimating: {
    Quick: {
      method: 'GetQuickEstimate',
      responseKey: 'ShipmentEstimates.ShipmentEstimate',
    },
    Full: {
      method: 'GetFullEstimate',
      responseKey: 'ShipmentEstimates.ShipmentEstimate',
    },
  },
  ServiceAvailability: {
    Validate: {
      method: 'ValidateCityPostalCodeZip',
      responseKey: 'SuggestedAddresses.SuggestedAddress',
    },
    Options: {
      method: 'GetServicesOptions',
      responseKey: 'Services.Service',
    },
  },
};

exports.getWSDL = (n) =>
  path.join(
    __dirname,
    process.env.NODE_ENV === 'production'
      ? `../wsdl/Production/${n}Service.wsdl`
      : `../wsdl/Development/${n}Service.wsdl`,
  );
