const { invoke, prefix, getError } = require('../utils');

describe('invoke', () => {
  it('should throw an error', () => {
    const curried = invoke('foo', 'bar');
    expect(() => curried({})).toThrowError();
  });

  it('should invoke method with arguments', () => {
    const foo = jest.fn();
    const curried = invoke('foo', 'bar');
    curried({ foo });
    expect(foo).toHaveBeenCalledWith('bar');
  });
});

describe('prefix', () => {
  it('should prefix everything with ns1', () =>
    expect(
      prefix(
        {
          foo: 'bar',
          quuz: {
            garply: 1,
          },
        },
        'pre',
      ),
    ).toMatchObject({
      'pre:foo': 'bar',
      'pre:quuz': {
        'pre:garply': 1,
      },
    }));
});

describe('getError', () => {
  it('should return Fault', () =>
    expect(getError({ Fault: 'foo' })).rejects.toMatch(
      'foo',
    ));

  it('should return Body', () =>
    expect(getError({ Body: 'bar' })).rejects.toMatch(
      'bar',
    ));
});
