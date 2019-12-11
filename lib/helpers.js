const get = require('lodash.get');

const isObject = (o) => o && typeof o === 'object';

const hasProperty = (target, prop) =>
  isObject(target) && prop in target;

const getProperty = (target, props) =>
  props.reduce(
    (curr, next) =>
      isObject(target) && next in target
        ? target[next]
        : curr,
    target,
  );

exports.invoke = (methodName, payload) => (client) => {
  if (
    !hasProperty(client, methodName) ||
    typeof client[methodName] !== 'function'
  )
    throw new Error(
      'Method not available through this adapter',
    );

  const fn = client[methodName];
  return fn(payload);
};

exports.prefix = (obj = {}, frontmatter = '') => {
  const reassignKeyValue = (input) =>
    Object.entries(input).reduce(
      (output, [key, value]) =>
        Object.assign(output, {
          [`${frontmatter}:${key}`]:
            typeof value === 'object'
              ? reassignKeyValue(value)
              : value,
        }),
      {},
    );

  return reassignKeyValue(obj);
};

exports.getError = (e) =>
  Promise.reject(
    getProperty(e, ['Error', 'Fault', 'Body', 'message']),
  );

exports.getResponse = (responseKey) => ([response]) => {
  if (
    hasProperty(
      response,
      'ResponseInformation' &&
        hasProperty(response.ResponseInformation, 'Errors'),
    )
  )
    throw response.ResponseInformation.Errors;

  return get(response, responseKey, response);
};
