require('dotenv').config();
const PurolatorServices = require('..');
const quickEstimate = require('../__fixtures__/GetQuickEstimate');
const fullEstimate = require('../__fixtures__/GetFullEstimate');
const zip = require('../__fixtures__/ValidateCityPostalCodeZip');
const options = require('../__fixtures__/GetServicesOptions');

let agent;

beforeAll(() => {
  agent = new PurolatorServices(
    process.env.PUROLATOR_KEY,
    process.env.PUROLATOR_KEY_PASSWORD,
  );
});

describe('PurolatorServices integration tests', () => {
  describe('estimate', () => {
    it('should resolve into an array', async () => {
      const resp = await agent.estimate(quickEstimate);
      expect(resp).toEqual(expect.any(Array));
      expect(resp.length).toBeGreaterThan(1);
    });

    it('should resolve into an array', async () => {
      const resp = await agent.estimate(quickEstimate, {
        ids: ['PurolatorExpress', 'PurolatorGround'],
      });

      expect(resp).toHaveLength(2);
    });

    it('should return full estimate', async () => {
      await agent.estimate(fullEstimate, {
        full: true,
      });
    });
  });

  describe('validatePostalCode', () => {
    it('should resolve into an array', async () => {
      const resp = await agent.validatePostalCode(zip);
      expect(resp).toHaveLength(1);
    });
  });

  describe('getAvailabilityOptions', () => {
    it('should resolve into an array', () =>
      expect(
        agent.getAvailabilityOptions(options),
      ).resolves.toHaveLength(19));
  });
});
