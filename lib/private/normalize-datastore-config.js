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



  // //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐
  // //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │  │ ││││├┤ ││ ┬
  // //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘└─┘┘└┘└  ┴└─┘
  // // If a URL config value was not given, ensure that all the various pieces
  // // needed to create one exist.
  // var hasURL = _.has(inputs.config, 'url');

  // // Validate that the connection has a host and database property
  // if (!hasURL && !inputs.config.host) {
  //   return exits.badConfiguration(new Error('Connection config is missing a host value.'));
  // }

  // if (!hasURL && !inputs.config.database) {
  //   return exits.badConfiguration(new Error('Connection config is missing a database value.'));
  // }


  // //  ╔═╗╔═╗╔╗╔╔═╗╦═╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
  // //  ║ ╦║╣ ║║║║╣ ╠╦╝╠═╣ ║ ║╣   │  │ │││││││├┤ │   │ ││ ││││
  // //  ╚═╝╚═╝╝╚╝╚═╝╩╚═╩ ╩ ╩ ╚═╝  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
  // //  ┌─┐┌┬┐┬─┐┬┌┐┌┌─┐  ┬ ┬┬─┐┬
  // //  └─┐ │ ├┬┘│││││ ┬  │ │├┬┘│
  // //  └─┘ ┴ ┴└─┴┘└┘└─┘  └─┘┴└─┴─┘
  // // If the connection details were not supplied as a URL, make them into one.
  // // This is required for the underlying driver in use.
  // if (!hasURL) {
  //   var url = 'mongodb://';
  //   var port = inputs.config.port || '27017';

  //   // If authentication is used, add it to the connection string
  //   if (inputs.config.user && inputs.config.password) {
  //     url += inputs.config.user + ':' + inputs.config.password + '@';
  //   }

  //   url += inputs.config.host + ':' + port + '/' + inputs.config.database;
  //   inputs.config.url = url;
  // }


};
