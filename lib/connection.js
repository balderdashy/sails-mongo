/**
 * Module dependencies
 */

var _ = require('lodash');
var Mongo = require('machinepack-mongodb');

/**
 * Manage a connection to a Mongo Server
 *
 * @param {Object} config
 * @return {Object}
 * @api private
 */

var Connection = module.exports = function Connection(config) {
  // Hold the config object
  this.config = config || {};

  return this;
};


//  ╔═╗╦ ╦╔╗ ╦  ╦╔═╗  ╔╦╗╔═╗╔╦╗╦ ╦╔═╗╔╦╗╔═╗
//  ╠═╝║ ║╠╩╗║  ║║    ║║║║╣  ║ ╠═╣║ ║ ║║╚═╗
//  ╩  ╚═╝╚═╝╩═╝╩╚═╝  ╩ ╩╚═╝ ╩ ╩ ╩╚═╝═╩╝╚═╝


/**
 * Create A Collection
 * Can't use the query runner helper because we need to run multiple queries.
 *
 * @param {String} name
 * @param {Object} collection
 * @param {Function} callback
 * @api public
 */

Connection.prototype.createCollection = function createCollection(name, collection, cb) {
  var self = this;

  var query = {
    create: name
  };

  this._runSingleQuery(query, function createIdx(err) {
    if (err) {
      return cb(err);
    }

    return self._ensureIndexes(name, collection.indexes, cb);
  });
};

/**
 * Drop A Collection
 *
 * @param {String} name
 * @param {Function} callback
 * @api public
 */

Connection.prototype.dropCollection = function dropCollection(name, cb) {
  var query = {
    drop: name
  };

  this._runSingleQuery(query, cb);
};


/**
 * List Collections
 *
 * @param {String} collectionName
 * @param {Function} callback
 * @api public
 */

Connection.prototype.listCollections = function listCollection(collectionName, cb) {
  var query = {
    listCollections: 1,
    filter: {
      name: collectionName
    }
  };

  this._runSingleQuery(query, cb);
};

/**
 * Close Connection
 *
 * @param {Function} callback
 * @api public
 */

Connection.prototype.closeConnection = function closeConnection(cb) {
  Mongo.releaseConnection({
    connection: this.db.connection
  }).exec({
    error: function error(err) {
      return cb(err);
    },
    success: function success() {
      return cb();
    }
  });
};


//  ╔═╗╦═╗╦╦  ╦╔═╗╔╦╗╔═╗  ╔╦╗╔═╗╔╦╗╦ ╦╔═╗╔╦╗╔═╗
//  ╠═╝╠╦╝║╚╗╔╝╠═╣ ║ ║╣   ║║║║╣  ║ ╠═╣║ ║ ║║╚═╗
//  ╩  ╩╚═╩ ╚╝ ╩ ╩ ╩ ╚═╝  ╩ ╩╚═╝ ╩ ╩ ╩╚═╝═╩╝╚═╝


/**
 * Build Server and Database Connection Objects
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype._buildConnection = function _buildConnection(cb) {
  var self = this;

  // Set the configured options
  var connectionOptions = {};

  connectionOptions.mongos = this.config.mongos || {};
  connectionOptions.replSet = this.config.replSet || {};

  // Build up options used for creating a Server instance
  connectionOptions.server = {
    readPreference: this.config.readPreference,
    ssl: this.config.ssl,
    sslValidate: this.config.sslValidate,
    sslCA: this.config.sslCA,
    sslCert: this.config.sslCert,
    sslKey: this.config.sslKey,
    poolSize: this.config.poolSize,
    socketOptions: this.config.socketOptions,
    autoReconnect: this.config.auto_reconnect,
    disableDriverBSONSizeCheck: this.config.disableDriverBSONSizeCheck,
    reconnectInterval: this.config.reconnectInterval
  };

  // Build up options used for creating a Database instance
  connectionOptions.db = {
    w: this.config.w,
    wtimeout: this.config.wtimeout,
    fsync: this.config.fsync,
    journal: this.config.journal,
    readPreference: this.config.readPreference,
    native_parser: this.config.nativeParser,
    forceServerObjectId: this.config.forceServerObjectId,
    recordQueryStats: this.config.recordQueryStats,
    retryMiliSeconds: this.config.retryMiliSeconds,
    numberOfRetries: this.config.numberOfRetries
  };

  // Support for encoded auth credentials
  connectionOptions.uri_decode_auth = this.config.uri_decode_auth || false;

  // Build A Mongo Connection String
  var connectionString = 'mongodb://';

  // If auth is used, append it to the connection string
  if (this.config.user && this.config.password) {
    // Ensure a database was set if auth in enabled
    if (!this.config.database) {
      throw new Error('The MongoDB Adapter requires a database config option if authentication is used.');
    }

    connectionString += this.config.user + ':' + this.config.password + '@';
  }

  // Append the host and port
  connectionString += this.config.host + ':' + this.config.port + '/';

  if (this.config.database) {
    connectionString += this.config.database;
  }

  // Use config connection string if available
  if (this.config.url) {
    connectionString = this.config.url;
  }

  // Open a connection
  Mongo.getConnection({
    connectionString: connectionString,
    meta: {
      connectionOpts: connectionOptions
    }
  }).exec({
    error: function error(err) {
      return cb(err);
    },
    failedToConnect: function failedToConnect(err) {
      return cb(err);
    },
    success: function success(cnx) {
      self.db = cnx;
      return cb();
    }
  });
};

/**
 * Ensure Indexes
 *
 * @param {String} collection
 * @param {Array} indexes
 * @param {Function} callback
 * @api private
 */

Connection.prototype._ensureIndexes = function _ensureIndexes(collectionName, indexes, cb) {
  var idxMap = _.map(indexes, function idxMap(idx) {
    var index = idx.options;
    index.key = idx.index;
    index.name = _.first(_.keys(idx.index));

    return index;
  });

  // If there are no indexes to create, just return the cb
  if (!idxMap.length) {
    return cb();
  }

  var query = {
    createIndexes: collectionName,
    indexes: idxMap
  };

  // Build the indexes
  this._runSingleQuery(query, cb);
};

/**
 * Run a one-off query
 *
 * @param {Dictionary} nativeQuery
 * @param {Function} callback
 * @api private
 */

Connection.prototype._runSingleQuery = function _runSingleQuery(nativeQuery, cb) {
  Mongo.sendNativeQuery({
    connection: this.db.connection,
    nativeQuery: nativeQuery
  }).exec({
    error: function error(err) {
      return cb(err);
    },
    success: function success(results) {
      return cb(null, results.result);
    }
  });
};
