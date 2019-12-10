module.exports = {
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
