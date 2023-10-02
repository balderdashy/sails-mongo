/**
 * Module dependencies
 */

const assert = require('assert');
const _ = require('@sailshq/lodash');
const flaverr = require('flaverr');


/**
 * normalizePassword()
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {String}   password
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns  {String}
 *           The normalized value.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @throws {E_BAD_CONFIG} If cannot be normalized.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function normalizePassword (password) {

  assert(!_.isUndefined(password), 'Should be defined');

  if (!_.isString(password)) {
    throw flaverr('E_BAD_CONFIG', new Error('Invalid password.  Must be a string.'));
  }

  return password;

};
