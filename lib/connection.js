
/**
 * Module dependencies
 */

var async = require('async'),
    MongoClient = require('mongodb').MongoClient;

/**
 * Manage a connection to a Mongo Server
 *
 * @param {Object} config
 * @return {Object}
 * @api private
 */

var Connection = module.exports = function Connection(config, cb) {
  var self = this;

  // Hold the config object
  this.config = config || {};

  // Build Database connection
  this._buildConnection(function(err, db) {
    if(err) return cb(err);

    // Store the DB object
    self.db = db;

    // Return the connection
    cb(null, self);
  });
};


/////////////////////////////////////////////////////////////////////////////////
// PUBLIC METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Create A Collection
 *
 * @param {String} name
 * @param {Object} collection
 * @param {Function} callback
 * @api public
 */

Connection.prototype.createCollection = function createCollection(name, collection, cb) {
  var self = this;

  // Create the Collection
  this.db.createCollection(name, function(err, result) {
    if(err) return cb(err);

    // Create Indexes
    self._ensureIndexes(result, collection.indexes, cb);
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
  this.db.dropCollection(name, cb);
};


/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Build Server and Database Connection Objects
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype._buildConnection = function _buildConnection(cb) {

  // Set the configured options
  var connectionOptions = {
    mongos: {}
  };

  connectionOptions.replSet = this.config.replSet || {};

  // Build up options used for creating a Server instance
  connectionOptions.server_options = {
    readPreference: this.config.readPreference,
    ssl: this.config.ssl,
    poolSize: this.config.poolSize,
    socketOptions: this.config.socketOptions,
    auto_reconnect: this.config.auto_reconnect,
    disableDriverBSONSizeCheck: this.config.disableDriverBSONSizeCheck
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
  if(this.config.user && this.config.password) {

    // Ensure a database was set if auth in enabled
    if(!this.config.database) {
      throw new Error('The MongoDB Adapter requires a database config option if authentication is used.');
    }

    connectionString += this.config.user + ':' + this.config.password + '@';
  }

  // Append the host and port
  connectionString += this.config.host + ':' + this.config.port + '/';

  if(this.config.database) {
    connectionString += this.config.database;
  }

  // Use config connection string if available
  if(this.config.url) connectionString = this.config.url;

  // Open a Connection
  MongoClient.connect(connectionString, connectionOptions, cb);
};

/**
 * Ensure Indexes
 *
 * @param {String} collection
 * @param {Array} indexes
 * @param {Function} callback
 * @api private
 */

Connection.prototype._ensureIndexes = function _ensureIndexes(collection, indexes, cb) {
  var self = this;

  function createIndex(item, next) {
    collection.ensureIndex(item.index, item.options, next);
  }

  async.each(indexes, createIndex, cb);
};
