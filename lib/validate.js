const { parseString } = require('xml2js');
const fs = require('fs');
const get = require('lodash.get');
const validator = require('validator');

const dataPath = 'wsdl:definitions.wsdl:types';
const elementPath = 'xs:sequence[0].xs:element';
const sequencePath = `xs:complexContent[0].xs:extension[0].${elementPath}`;

const makePath = (a, b) => (a ? `${a}.${b}` : b);
const hasOptionalFlag = (v) => v.includes(':optional');
const stripOptionalFlag = (v) => v.replace(':optional', '');
const setOptionalFlag = (v) =>
  !hasOptionalFlag(v) ? `${v}:optional` : v;

const makeSequence = (target, path, fallbackPath) => {
  let a = get(target, path);
  if (!a || !Array.isArray(a))
    a = get(target, fallbackPath, []);

  return a.reduce(
    (prev, { $: root }) =>
      Object.assign(prev, {
        [root.name]:
          root.minOccurs === '0'
            ? setOptionalFlag(root.type)
            : root.type,
      }),
    {},
  );
};

const check = (methodName, defaultOptions) => (
  options,
  optional,
) => (v) => {
  const isFalsy = v === undefined || v === null || v === '';
  const transformed = String(v);

  if (optional && isFalsy) return true;
  if (!optional && isFalsy)
    throw new Error('This is a required property');

  if (
    validator.isEmpty(transformed) ||
    !validator[methodName](
      transformed,
      defaultOptions || options,
    )
  )
    throw new Error(
      `Failed validation on ${methodName}: ${v}`,
    );

  return true;
};

const getValues = (v) =>
  v
    .substring(v.lastIndexOf('[') + 1, v.lastIndexOf(']'))
    .split(',');

const buildOptions = (v) =>
  v.map(({ $: r }) => r.value).join(',');

const simpleElements = {
  anyURI: check('isDataURI'),
  base64Binary: check('isBase64'),
  boolean: check('isBoolean'),
  dateTime: check('isBoolean'),
  byte: check('isByteLength'),
  decimal: check('isDecimal'),
  double: check('isFloat'),
  float: check('isFloat'),
  int: check('isInt'),
  long: check('isInt'),
  QName: check('isAlphanumeric', 'en-US'),
  short: check('isInt'),
  string: check('isLength', { min: 1 }),
  unsignedByte: check('isInt'),
  unsignedInt: check('isInt'),
  unsignedLong: check('isInt'),
  unsignedShort: check('isInt'),
  char: check('isInt'),
  enum: check('isIn'),
  default: () => true,
};

simpleElements.get = function findXs(v) {
  return Object.keys(simpleElements).reduce(
    (prev, curr) => {
      const optional = hasOptionalFlag(v);

      if (v.includes('xs:enum'))
        return this.enum(getValues(v), optional);

      return v.includes(curr)
        ? this[curr](null, optional)
        : prev;
    },
    this.default,
  );
};

class WsdlValidationAdapter {
  constructor(wsdl) {
    this.wsdl = fs.readFileSync(wsdl, 'utf8');
    this.validation = {};
    this.schema = [];
  }

  get sanitized() {
    return this.wsdl.replace(/xsd/g, 'xs');
  }

  get complexType() {
    return this.schema
      .flatMap((item) => item['xs:complexType'])
      .filter(Boolean);
  }

  get simpleType() {
    return this.schema
      .flatMap((item) => item['xs:simpleType'])
      .filter(Boolean);
  }

  async $parse() {
    return new Promise((resolve, reject) =>
      parseString(this.sanitized, (err, result) => {
        if (err) reject(err);
        resolve(result);
      }),
    );
  }

  $mapToComplex() {
    this.complexType.forEach((item) => {
      this.validation[`tns:${item.$.name}`] = makeSequence(
        item,
        sequencePath,
        elementPath,
      );
    });
  }

  $mapToSimple() {
    this.simpleType.forEach(
      ({ $: root, 'xs:restriction': [restriction] }) => {
        this.validation[`tns:${root.name}`] = restriction[
          'xs:enumeration'
        ]
          ? `xs:enum[${buildOptions(
              restriction['xs:enumeration'],
            )}]`
          : restriction.$.base;
      },
    );
  }

  $mapToFns(sequence) {
    const useSimple = (o, parentWasSetToOptional) =>
      Object.entries(o).reduce((prev, [key, value]) => {
        const tns = value.startsWith('tns')
          ? this.validation[stripOptionalFlag(value)]
          : value;

        const newValue =
          typeof tns === 'object'
            ? useSimple(
                tns,
                hasOptionalFlag(value) ||
                  parentWasSetToOptional,
              )
            : simpleElements.get(
                parentWasSetToOptional
                  ? setOptionalFlag(value)
                  : tns,
              );

        return Object.assign(prev, {
          [key]: newValue,
        });
      }, {});

    return useSimple(sequence);
  }

  async build() {
    try {
      const re = await this.$parse();
      this.schema = get(re, `${dataPath}[0].xs:schema`, []);
      this.$mapToComplex();
      this.$mapToSimple();
    } catch (e) {
      // noop
    }
  }

  get(name) {
    const type = this.complexType.find(
      (complex) =>
        get(complex, '$.name') ===
        `${name}RequestContainer`,
    );

    const seq = makeSequence(type, sequencePath);
    return this.$mapToFns(seq);
  }

  static run(schema, input = {}) {
    const runValidationMethod = (v, path) =>
      Object.entries(v).reduce((acc, [key, value]) => {
        const location = makePath(path, key);
        const fn = get(schema, location);
        const test = get(input, location);

        if (typeof value === 'object') {
          Object.assign(
            acc,
            runValidationMethod(value, location),
          );
        } else {
          try {
            fn(test);
          } catch (e) {
            acc[location] = e.message;
          }
        }

        return acc;
      }, {});

    const errors = runValidationMethod(schema);
    // console.log(errors);
    return errors;
  }
}

module.exports = WsdlValidationAdapter;
