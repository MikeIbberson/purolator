const path = require('path');
const WsdlValidationAdapter = require('../validate');

let fixture;

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

beforeAll(() => {
  fixture = path.join(
    __dirname,
    '../../wsdl/Production/TrackingService.wsdl',
  );
});

describe('WsdlValidationAdapter', () => {
  describe('instantiation', () => {
    it('should parse wsdl file in utfc', async () =>
      expect(
        new WsdlValidationAdapter(fixture).wsdl,
      ).toEqual(expect.any(String)));
  });

  describe('build', () => {
    it('should standardize xs and xsd tags', async () => {
      const adapter = new WsdlValidationAdapter(fixture);
      const before = adapter.wsdl.match(/xsd/g).length;
      const after = adapter.sanitized.match(/xsd/g);
      expect(before).toBeGreaterThan(0);
      expect(after).toBeNull();
    });

    it('should set schema', async () => {
      const adapter = new WsdlValidationAdapter(fixture);
      await adapter.build();
      expect(adapter.schema.length).toBeGreaterThan(1);
    });

    it('should set validation', async () => {
      const adapter = new WsdlValidationAdapter(fixture);
      await adapter.build();
      const { validation } = adapter;
      const keys = Object.keys(validation);
      hasLength(validation);
      expect(hasValidationRule(validation)).toBeTruthy();
      expect(hasNameSpace(keys)).toBeTruthy();
    });
  });

  describe('getByContainerName', () => {
    it('should return validation object', async () => {
      const adapter = new WsdlValidationAdapter(fixture);
      await adapter.build();
      const schema = adapter.getByContainerName(
        'TrackPackagesByReference',
      );

      hasLength(schema);
      expect(hasFunctions(schema)).toBeTruthy();
    });
  });
});
