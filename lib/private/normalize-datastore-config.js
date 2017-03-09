/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');


/**
 * normalizeDatastoreConfig()
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Dictionary}   dsConfig
 *         ˚¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯\
 *         ˙ identity: {String}       :: The name of this datastore.  (Used for error messages.)
 *         ˙ url: {String?}           ::
 *         ˙ host: {String?}          ::
 *         ˙ port: {String?}          ::
 *         ˙ user: {String?}          ::
 *         ˙ password: {String?}      ::
 *         ˙ databaseName: {String?}  ::
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function normalizeDatastoreConfig (dsConfig) {

  // Sanity checks
  assert(_.isString(dsConfig.identity) && dsConfig.identity);

  // Get convenient reference to this datastore's name.
  var datastoreName = dsConfig.identity;

  // Ensure a `url` was configured.
  // > To help standardize configuration for end users, adapter authors
  // > are encouraged to support the `url` setting, if conceivable.
  // >
  // > Read more here:
  // > http://sailsjs.com/config/datastores#?the-connection-url
  if (!dsConfig.url) {
    return done(new Error('Invalid configuration for datastore `' + datastoreName + '`:  Missing `url` (See http://sailsjs.com/config/datastores#?the-connection-url for more info.)'));
  }

  // TODO

};
