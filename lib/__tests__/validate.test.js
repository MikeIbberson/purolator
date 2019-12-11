const path = require('path');
const WsdlValidationAdapter = require('../validate');

let adapter;

const hasNameSpace = (a) =>
  a.every((n) => n.startsWith('tns'));

const hasValidationRule = (a) =>
  Object.values(a).every((n) => {
    if (typeof n === 'object') return hasValidationRule(n);
    return (
      n.startsWith('tns') ||
      n.startsWith('xs') ||
      n.startsWith('q1')
    );
  });

const hasLength = (a) =>
  expect(Object.keys(a).length).toBeGreaterThan(0);

const hasFunctions = (a) =>
  Object.values(a).every((n) => {
    if (typeof n === 'object') return hasFunctions(n);
    return typeof n === 'function';
  });

beforeAll(async () => {
  adapter = new WsdlValidationAdapter(
    path.join(
      __dirname,
      '../../wsdl/Production/TrackingService.wsdl',
    ),
  );

  await adapter.build();
});

describe('WsdlValidationAdapter', () => {
  describe('instantiation', () => {
    it('should parse wsdl file in utfc', async () =>
      expect(adapter.wsdl).toEqual(expect.any(String)));
  });

  describe('build', () => {
    it('should standardize xs and xsd tags', async () => {
      const before = adapter.wsdl.match(/xsd/g).length;
      const after = adapter.sanitized.match(/xsd/g);
      expect(before).toBeGreaterThan(0);
      expect(after).toBeNull();
    });

    it('should set schema', async () =>
      expect(adapter.schema.length).toBeGreaterThan(1));

    it('should set validation', async () => {
      const { validation } = adapter;
      const keys = Object.keys(validation);
      hasLength(validation);
      expect(hasValidationRule(validation)).toBeTruthy();
      expect(hasNameSpace(keys)).toBeTruthy();
    });
  });

  describe('get', () => {
    let schema;

    beforeAll(() => {
      schema = adapter.get('TrackPackagesByReference');
    });

    it('should return validation object', async () => {
      hasLength(schema);
      expect(hasFunctions(schema)).toBeTruthy();
    });

    it('should run validation and pass', () =>
      expect(
        WsdlValidationAdapter.run(schema, {
          TrackPackageByReferenceSearchCriteria: {
            Reference: '123',
            DesinationPostalCode: 'l1xr8r',
            DestinationCountryCode: 'CA',
            BillingAccountNumber: '9999',
            ShipmentFromDate: '2019-02-12',
            ShipmentToDate: '2021-12-12',
          },
        }),
      ).toMatchObject({}));

    it('should run validation and fail', () =>
      expect(
        WsdlValidationAdapter.run(schema, {
          TrackPackageByReferenceSearchCriteria: {},
        }),
      ).toMatchObject({
        'TrackPackageByReferenceSearchCriteria.Reference': expect.any(
          String,
        ),
        'TrackPackageByReferenceSearchCriteria.ShipmentFromDate': expect.any(
          String,
        ),
        'TrackPackageByReferenceSearchCriteria.ShipmentToDate': expect.any(
          String,
        ),
      }));
  });
});
