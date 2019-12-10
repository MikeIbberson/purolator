const path = require('path');

exports.datatypes = 'http://purolator.com/pws/datatypes';

exports.responses = {
  Estimating: {
    Quick: {
      method: 'GetQuickEstimateAsync',
      responseKey: 'ShipmentEstimates.ShipmentEstimate',
    },
    Full: {
      method: 'GetFullEstimateAsync',
      responseKey: 'ShipmentEstimates.ShipmentEstimate',
    },
  },
  ServiceAvailability: {
    Validate: {
      method: 'ValidateCityPostalCodeZipAsync',
      responseKey: 'SuggestedAddresses.SuggestedAddress',
    },
    Options: {
      method: 'GetServicesOptionsAsync',
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
