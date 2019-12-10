const { getWSDL } = require('../config');

describe('SOAP config helpers', () => {
  describe('getWSDL', () => {
    it('should serve development files', () =>
      expect(getWSDL('Estimating')).toMatch(
        'Development\\Estimating',
      ));
  });
});
