const {
  getWSDL,
  onError,
  ensureNameSpace,
} = require('../config');

describe('SOAP config helpers', () => {
  describe('getWSDL', () => {
    it('should serve development files', () =>
      expect(getWSDL('Estimating')).toMatch(
        'Development\\Estimating',
      ));
  });

  describe('onError', () => {
    it('should  return Fault', () =>
      expect(onError({ Fault: 'foo' })).rejects.toMatch(
        'foo',
      ));

    it('should return Body', () =>
      expect(onError({ Body: 'bar' })).rejects.toMatch(
        'bar',
      ));
  });

  describe('ensureNameSpace', () => {
    it('should prefix everything with ns1', () =>
      expect(
        ensureNameSpace({
          foo: 'bar',
          quuz: {
            garply: 1,
          },
        }),
      ).toMatchObject({
        'ns1:foo': 'bar',
        'ns1:quuz': {
          'ns1:garply': 1,
        },
      }));
  });
});
