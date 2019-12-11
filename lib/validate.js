const { parseString } = require('xml2js');
const fs = require('fs');
const get = require('lodash.get');
const validator = require('validator');

// minOccurs="0"

const dataPath = 'wsdl:definitions.wsdl:types';
const elementPath = 'xs:sequence[0].xs:element';
const sequencePath = `xs:complexContent[0].xs:extension[0].${elementPath}`;

const makeSequence = (target, path, fallbackPath) => {
  let a = get(target, path);
  if (!a || !Array.isArray(a))
    a = get(target, fallbackPath, []);

  return a.reduce(
    (prev, { $: root }) =>
      Object.assign(prev, {
        [root.name]:
          root.minOccurs === '0'
            ? `${root.type}:optional`
            : root.type,
      }),
    {},
  );
};

const check = (methodName) => (options, optional) => (v) =>
  !optional || !validator.isEmpty(v)
    ? validator[methodName](v, options)
    : true;

const getValues = (v) =>
  v
    .substring(v.lastIndexOf('[') + 1, v.lastIndexOf(']'))
    .split(',');

const buildOptions = (v) =>
  v.map(({ $: r }) => r.value).join(',');

// optional?
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
  QName: check('isAlphanumeric'),
  short: check('isInt'),
  string: check('isAlphanumeric'),
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
      let optional = false;
      if (v.includes('optional')) optional = true;
      if (v.includes('xs:enum'))
        return this.enum(getValues(v), optional);
      return v.includes(curr) ? this[curr](optional) : prev;
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
    const useSimple = (o) =>
      Object.entries(o).reduce((prev, [key, value]) => {
        const tns = value.startsWith('tns')
          ? this.validation[value]
          : simpleElements.get(value);

        return Object.assign(prev, {
          [key]:
            typeof tns === 'object' ? useSimple(tns) : tns,
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

  getByContainerName(name) {
    const type = this.complexType.find(
      (complex) =>
        get(complex, '$.name') ===
        `${name}RequestContainer`,
    );

    const seq = makeSequence(type, sequencePath);
    return this.$mapToFns(seq);
  }
}

module.exports = WsdlValidationAdapter;
