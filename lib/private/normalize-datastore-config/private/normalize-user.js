/**
 * Module dependencies
 */

const util = require('util');
const assert = require('assert');
const _ = require('@sailshq/lodash');
const flaverr = require('flaverr');


/**
 * normalizeUser()
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Ref}   user
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns  {String}
 *           The normalized value.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @throws {E_BAD_CONFIG} If cannot be normalized.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function normalizeUser(user) {

  assert(!_.isUndefined(user), 'Should be defined');

  if (_.isNumber(user)) {
    user = `${user}`;
  }// >-

  if (!_.isString(user)) {
    throw flaverr('E_BAD_CONFIG', new Error(`Invalid user (\`${util.inspect(user)}\`).  Must be a string.`));
  }

  return user;

};
