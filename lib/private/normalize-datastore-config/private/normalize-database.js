/**
 * Module dependencies
 */

const util = require('util');
const assert = require('assert');
const _ = require('@sailshq/lodash');
const flaverr = require('flaverr');


/**
 * normalizeDatabase()
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Ref}   dbName
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns  {String}
 *           The normalized value.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @throws {E_BAD_CONFIG} If cannot be normalized.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function normalizeDatabase(dbName) {

  assert(!_.isUndefined(dbName), 'Should be defined');

  if (_.isNumber(dbName)) {
    dbName = `${dbName}`;
  }// >-

  if (!_.isString(dbName)) {
    throw flaverr('E_BAD_CONFIG', new Error(`Invalid database (\`${util.inspect(dbName)}\`).  Must be a string or number.`));
  }

  return dbName;

};
