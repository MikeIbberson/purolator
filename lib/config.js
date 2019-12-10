require('dotenv').config();
const path = require('path');
const get = require('lodash.get');

exports.getWSDL = (n) =>
  path.join(
    __dirname,
    process.env.NODE_ENV === 'production'
      ? `../wsdl/Production/${n}Service.wsdl`
      : `../wsdl/Development/${n}Service.wsdl`,
  );

exports.onError = (e) => {
  let { message } = e;
  if ('Error' in e) message = e.Error;
  if ('Fault' in e) message = e.Fault;
  if ('Body' in e) message = e.Body;

  return Promise.reject(message);
};

exports.onResponse = (responseKey) => ([response]) => {
  if (
    response.ResponseInformation &&
    response.ResponseInformation.Errors
  )
    throw response.ResponseInformation.Errors;

  return get(response, responseKey, response);
};

exports.ensureNameSpace = (obj = {}) => {
  const reassign = (input) =>
    Object.entries(input).reduce(
      (output, [key, value]) =>
        Object.assign(output, {
          [`ns1:${key}`]:
            typeof value === 'object'
              ? reassign(value)
              : value,
        }),
      {},
    );

  return reassign(obj);
};
