module.exports = {


  friendlyName: 'Create manager',


  description: 'Build and initialize a connection manager instance (in Mongo, this is `db`).',


  moreInfoUrl: 'https://github.com/node-machine/driver-interface/blob/master/machines/create-manager.js',


  inputs: {

    connectionString: {
      description: 'The Mongo connection URL containing the configuration/credentials necessary for connecting to the database.',
      moreInfoUrl: 'http://sailsjs.com/documentation/reference/configuration/sails-config-datastores#?the-connection-url',
      // example: 'mongodb://foo:bar@localhost:27017/thedatabase',
      example: '===',
      required: true
    },

    onUnexpectedFailure: {
      friendlyName: 'On unxpected failure (unused)',
      description: 'A notifier function for otherwise-unhandled error events. (WARNING: Currently, this is ignored by mp-mongo!)',
      moreInfoUrl: 'https://github.com/node-machine/driver-interface/blob/3f3a150ef4ece40dc0d105006e2766e81af23719/machines/create-manager.js#L37-L49',
      // example: '->',
      example: '==='
    },

    meta: {
      friendlyName: 'Meta (custom)',
      description: 'A dictionary of additional options to pass in when instantiating the Mongo client instance. (e.g. `{ssl: true}`)',
      moreInfoUrl: 'https://github.com/node-machine/driver-interface/blob/3f3a150ef4ece40dc0d105006e2766e81af23719/constants/meta.input.js',
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'Connected to Mongo successfully.',
      outputFriendlyName: 'Report',
      outputDescription: 'The `manager` property is a Mongo client instance.  The `meta` property is unused.',
      // outputExample: {
      //   manager: '===',
      //   meta: '==='
      // }
      outputExample: '==='
    },

    malformed: {
      description: 'The provided connection string is malformed.',
      extendedDescription: 'The format of connection strings varies across different databases and their drivers. This exit indicates that the provided string is not valid as per the custom rules of this driver. Note that if this exit is traversed, it means the driver DID NOT ATTEMPT to create a manager-- instead the invalid connection string was discovered during a check performed beforehand.',
      outputFriendlyName: 'Report',
      outputDescription: 'The `error` property is a JavaScript Error instance explaining that (and preferably "why") the provided connection string is invalid. The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: {
        error: '===',
        meta: '==='
      }
    },

    failed: {
      description: 'Could not connect to Mongo using the specified connection URL.',
      extendedDescription:
        'If this exit is called, it might mean any of the following:\n' +
        ' + the credentials encoded in the connection string are incorrect\n' +
        ' + there is no database server running at the provided host (i.e. even if it is just that the database process needs to be started)\n' +
        ' + there is no software "database" with the specified name running on the server\n' +
        ' + the provided connection string does not have necessary access rights for the specified software "database"\n' +
        ' + this Node.js process could not connect to the database, perhaps because of firewall/proxy settings\n' +
        ' + any other miscellaneous connection error\n' +
        '\n' +
        'Note that even if the database is unreachable, bad credentials are being used, etc, ' +
        'this exit will not necessarily be called-- that depends on the implementation of the driver ' +
        'and any special configuration passed to the `meta` input. e.g. if a pool is being used that spins up ' +
        'multiple connections immediately when the manager is created, then this exit will be called if any of ' +
        'those initial attempts fail. On the other hand, if the manager is designed to produce adhoc connections, ' +
        'any errors related to bad credentials, connectivity, etc. will not be caught until `getConnection()` is called.',
      outputFriendlyName: 'Report',
      outputDescription: 'The `error` property is a JavaScript Error instance with more information and a stack trace. The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: {
        error: '===',
        meta: '==='
      }
    }

  },

  fn: function (inputs, exits) {

    var _ = require('@sailshq/lodash');
    var NodeMongoDBNativeLib = require('mongodb');
    var CONFIG_WHITELIST = require('../constants/config-whitelist.constant');
    var EXPECTED_URL_PROTOCOL_PFX = require('../constants/expected-url-protocol-pfx.constant');
    var normalizeDatastoreConfig = require('../normalize-datastore-config');

    // Note:
    // Support for different types of managers is database-specific, and is not
    // built into the Waterline driver spec-- however this type of configurability
    // can be instrumented using `meta`.
    //
    // Feel free to fork this adapter and customize as you see fit.  Also note that
    // contributions to the core adapter in this area are welcome and greatly appreciated!

    // Normalize datastore.
    var _clientConfig = _.extend({
      url: inputs.connectionString
    }, inputs.meta);

    try {
      normalizeDatastoreConfig(_clientConfig, CONFIG_WHITELIST, EXPECTED_URL_PROTOCOL_PFX);
    } catch (e) {
      switch (e.code) {
        case 'E_BAD_CONFIG': return exits.malformed({ error: e, meta: undefined });
        default: return exits.error(e);
      }
    }

    // Mongo doesn't like some of our standard properties, so we'll remove them
    // (we don't need any of them now anyway, since we know at this point that
    // they'll have been baked into the URL)
    var mongoUrl = _clientConfig.url;
    _clientConfig = _.omit(_clientConfig, ['url', 'user', 'password', 'host', 'port', 'database']);

    NodeMongoDBNativeLib.MongoClient.connect(mongoUrl, _clientConfig, function connectCb(err, db) {
      if (err) {
        return exits.error(err);
      }

      // `db` will be our manager.
      // (This variable is just for clarity.)
      var manager = db;

      // Now mutate this manager, giving it a telltale.
      //
      // > For more context/history, see:
      // > https://github.com/treelinehq/machinepack-mongo/issues/2#issuecomment-267517800
      // >
      // > (^^But that's not the real reason to include it -- we ended up solving it differently
      // > anyway.  No, the real reason is so that there's a way to tell if a given Mongo client
      // > instance came from mp-mongo or not, for debugging reasons.)
      manager._isFromMPMongo = true;

      return exits.success({
        manager: manager,
        meta: inputs.meta
      });
    });//</ .connect() >
  }


};
