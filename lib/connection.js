
/**
 * Module dependencies
 */

var async = require('async'),
    Db = require('mongodb').Db,
    Server = require('mongodb').Server;

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

  // Build Database connection
  this.buildConnection();

  return this;
};


/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Build Server and Database Connection Objects
 *
 * @api private
 */

Connection.prototype.buildConnection = function buildConnection() {

  // Set Safe Mode
  var safe = this.config.safe ? 1 : 0;

  // Build up options used for creating a Server instance
  var serverOptions = {
    native_parser: this.config.nativeParser,
    auth: {
      user: this.config.user,
      password: this.config.password
    }
  };

  // Build up options used for creating a Database instance
  var databaseOptions = {
    w: safe,
    native_parser: this.config.nativeParser
  };

  this.server = new Server(this.config.host, this.config.port, serverOptions);
  this.database = new Db(this.config.database, this.server, databaseOptions);
};


/**
 * Open a Connection
 *
 * Open a new Mongo connection.
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype.open = function open(cb) {
  var self = this;

  this.database.open(function(err) {
    if (err) return cb(err);
    self.authenticate(cb);
  });
};

/**
 * Close a Connection
 *
 * Closes an open Connection object
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype.close = function close(cb) {
  this.database.close(cb);
};

/**
 * Authenticate A Connection
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype.authenticate = function authenticate(cb) {
  var self = this,
      options = this.database.serverConfig.options;

  if(!options.auth.user && !options.auth.password) return cb();

  this.database.authenticate(options.auth.user, auth.password, function(err, success) {

    // The authentication was a success, the database should now be authenticated
    if(success) return cb();

    // The authentication was unsuccessful
    self.close(function() {
      if(err) return cb(err);
      cb(new Error('Could not authenticate the User/Password combination provided.'));
    });
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

Connection.prototype.ensureIndexes = function ensureIndexes(collection, indexes, cb) {
  var self = this;

  function createIndex(item, next) {
    collection.ensureIndex(item.index, item.options, next);
  }

  async.each(indexes, createIndex, cb);
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

  // Open a Connection, handles errors by itself
  this.database.open(function() {

    // Create the Collection
    self.database.createCollection(name, function(err, result) {
      if(err) {
        return self.close(function() {
          cb(err);
        });
      }

      // Create Indexes
      self.ensureIndexes(result, collection.indexes, function(err) {
        self.close(function() {
          cb(err);
        });
      });
    });
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
  var self = this;

  // Open a Connection, handles errors by itself
  this.database.open(function() {

    // Drop the collection
    self.database.dropCollection(name, function(err) {
      self.close(function() {
        cb(err);
      });
    });
  });
};
