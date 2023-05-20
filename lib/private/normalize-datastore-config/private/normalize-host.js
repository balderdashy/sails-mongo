/**
 * Module dependencies
 */

const util = require('util');
const assert = require('assert');
const _ = require('@sailshq/lodash');
const flaverr = require('flaverr');


/**
 * normalizeHost()
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Ref}   host
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns  {String}
 *           The normalized value.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @throws {E_BAD_CONFIG} If cannot be normalized.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function normalizeHost(host) {

  assert(!_.isUndefined(host), 'Should be defined');

  if (_.isNumber(host)) {
    host = `${host}`;
  }// >-

  if (!_.isString(host) || host === '') {
    throw flaverr('E_BAD_CONFIG', new Error(`Invalid host (\`${util.inspect(host)}\`).  Must be a non-empty string.`));
  }

  return host;

};
