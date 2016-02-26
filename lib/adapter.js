//  ███████╗ █████╗ ██╗██╗     ███████╗
//  ██╔════╝██╔══██╗██║██║     ██╔════╝
//  ███████╗███████║██║██║     ███████╗
//  ╚════██║██╔══██║██║██║     ╚════██║
//  ███████║██║  ██║██║███████╗███████║
//  ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝
//
//  ███╗   ███╗ ██████╗ ███╗   ██╗ ██████╗  ██████╗
//  ████╗ ████║██╔═══██╗████╗  ██║██╔════╝ ██╔═══██╗
//  ██╔████╔██║██║   ██║██╔██╗ ██║██║  ███╗██║   ██║
//  ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║██║   ██║
//  ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║╚██████╔╝╚██████╔╝
//  ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝
//
// An adapter for MongoDB and Waterline

var _ = require('lodash');
var async = require('async');
var util = require('util');
var Cursor = require('waterline-cursor');
var Errors = require('waterline-errors').adapter;
var Connection = require('./connection');
var Collection = require('./collection');

module.exports = (function adapter() {
  // Keep track of all the connections used by the app
  var connections = {};

  var adapter = {

    // Which type of primary key is used by default
    pkFormat: 'string',

    // to track schema internally
    syncable: true,

    // Expose all the connection options with default settings
    defaults: {

      // Connection Configuration
      host: 'localhost',
      database: 'sails',
      port: 27017,
      user: null,
      password: null,
      schema: false,

      // Allow a URL Config String
      url: null,

      // DB Options
      w: 1,
      wtimeout: 0,
      fsync: false,
      journal: false,
      readPreference: null,
      nativeParser: false,
      forceServerObjectId: false,
      recordQueryStats: false,
      retryMiliSeconds: 5000,
      numberOfRetries: 5,

      // Server Options
      ssl: false,
      poolSize: 5,
      socketOptions: {
        noDelay: true,
        keepAlive: 0,
        connectTimeoutMS: 0,
        socketTimeoutMS: 0
      },
      auto_reconnect: true,
      disableDriverBSONSizeCheck: false,
      reconnectInterval: 200,

      // Waterline NEXT
      // These are flags that can be toggled today and expose future features. If any of the following are turned
      // on the adapter tests will probably not pass. If you toggle these know what you are getting into.
      wlNext: {

        // Case sensitive - false
        // In the next version of WL queries will be case sensitive by default.
        // Set this to true to experiment with that feature today.
        caseSensitive: false

      }

    },


    //  ╦═╗╔═╗╔═╗╦╔═╗╔╦╗╔═╗╦═╗  ╔═╗╔═╗╔╗╔╔╗╔╔═╗╔═╗╔╦╗╦╔═╗╔╗╔
    //  ╠╦╝║╣ ║ ╦║╚═╗ ║ ║╣ ╠╦╝  ║  ║ ║║║║║║║║╣ ║   ║ ║║ ║║║║
    //  ╩╚═╚═╝╚═╝╩╚═╝ ╩ ╚═╝╩╚═  ╚═╝╚═╝╝╚╝╝╚╝╚═╝╚═╝ ╩ ╩╚═╝╝╚╝
    //
    // Will open up a new connection using the configuration provided and store
    // the DB object to run commands off of. This creates a new pool for each
    // connection config.
    registerConnection: function registerConnection(connection, collections, cb) {
      if (!connection.identity) {
        return cb(Errors.IdentityMissing);
      }

      if (connections[connection.identity]) {
        return cb(Errors.IdentityDuplicate);
      }

      // Merging default options
      connection = _.defaults(connection, this.defaults);

      // Store the connection
      connections[connection.identity] = {
        config: connection,
        collections: {}
      };

      // Build Database connection
      var db = new Connection(connection);
      db._buildConnection(function buildCnx(err) {
        if (err) {
          return cb((function _createError() {
            var msg = util.format('Failed to connect to MongoDB.  Are you sure your configured Mongo instance is running?\n Error details:\n%s', util.inspect(err, false, null));
            var err = new Error(msg);
            err.originalError = err;
            return err;
          })());
        }

        connections[connection.identity].connection = db;

        // Build up a registry of collections
        _.each(collections, function saveCollection(val, key) {
          connections[connection.identity].collections[key] = new Collection(val, db);
        });

        return cb();
      });
    },


    //  ╔╦╗╔═╗╔═╗╦═╗╔╦╗╔═╗╦ ╦╔╗╔  ╔═╗╔═╗╔╗╔╔╗╔╔═╗╔═╗╔╦╗╦╔═╗╔╗╔
    //   ║ ║╣ ╠═╣╠╦╝ ║║║ ║║║║║║║  ║  ║ ║║║║║║║║╣ ║   ║ ║║ ║║║║
    //   ╩ ╚═╝╩ ╩╩╚══╩╝╚═╝╚╩╝╝╚╝  ╚═╝╚═╝╝╚╝╝╚╝╚═╝╚═╝ ╩ ╩╚═╝╝╚╝
    //
    // Closes the connection pool and removes the connection object from the
    // internal connection registry.
    teardown: function teardown(conn, cb) {
      if (typeof conn == 'function') {
        cb = conn;
        conn = null;
      }

      if (conn === null) {
        var _connections = _.keys(connections);
        if (!_connections.length) {
          return cb();
        }

        return async.each(_connections, function closeConn(db, onClosed) {
          if (connections[db] === undefined) {
            return onClosed();
          }

          connections[db].connection.closeConnection(function closeConnection(err) {
            if (err) {
              return onClosed(err);
            }

            delete connections[db];
            return onClosed();
          });
        }, cb);
      }

      if (!connections[conn]) {
        return cb();
      }

      connections[conn].connection.closeConnection(function closeConnection(err) {
        if (err) {
          return cb(err);
        }

        delete connections[conn];
        return cb();
      });
    },


    //  ╔╦╗╔═╗╔═╗╔═╗╦═╗╦╔╗ ╔═╗  ╔═╗╔═╗╦  ╦  ╔═╗╔═╗╔╦╗╦╔═╗╔╗╔
    //   ║║║╣ ╚═╗║  ╠╦╝║╠╩╗║╣   ║  ║ ║║  ║  ║╣ ║   ║ ║║ ║║║║
    //  ═╩╝╚═╝╚═╝╚═╝╩╚═╩╚═╝╚═╝  ╚═╝╚═╝╩═╝╩═╝╚═╝╚═╝ ╩ ╩╚═╝╝╚╝
    //
    // Return the Schema of a collection after first creating the collection
    // and indexes if they don't exist.
    describe: function describe(connectionName, collectionName, cb) {
      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];
      var schema = collection.schema;

      connectionObject.connection.listCollections(collectionName, function listCollections(err, docs) {
        if (err) {
          return cb(err);
        }

        var names = _.map(docs, function buildNames(doc) {
          return doc.name;
        });

        if (names.length > 0) {
          return cb(null, schema);
        }

        cb();
      });
    },


    //  ╔╦╗╔═╗╔═╗╦╔╗╔╔═╗  ╔═╗╔═╗╦  ╦  ╔═╗╔═╗╔╦╗╦╔═╗╔╗╔
    //   ║║║╣ ╠╣ ║║║║║╣   ║  ║ ║║  ║  ║╣ ║   ║ ║║ ║║║║
    //  ═╩╝╚═╝╚  ╩╝╚╝╚═╝  ╚═╝╚═╝╩═╝╩═╝╚═╝╚═╝ ╩ ╩╚═╝╝╚╝
    //
    // Create a new Mongo Collection and set Index Values.
    define: function define(connectionName, collectionName, definition, cb) {
      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];

      connectionObject.connection.createCollection(collectionName, collection, cb);
    },


    //  ╔╦╗╦═╗╔═╗╔═╗  ╔═╗╔═╗╦  ╦  ╔═╗╔═╗╔╦╗╦╔═╗╔╗╔
    //   ║║╠╦╝║ ║╠═╝  ║  ║ ║║  ║  ║╣ ║   ║ ║║ ║║║║
    //  ═╩╝╩╚═╚═╝╩    ╚═╝╚═╝╩═╝╩═╝╚═╝╚═╝ ╩ ╩╚═╝╝╚╝
    //
    // Drop a Collection.
    drop: function drop(connectionName, collectionName, relations, cb) {
      if (_.isFunction(relations)) {
        cb = relations;
        relations = [];
      }

      var connectionObject = connections[connectionName];

      // Drop the collection and indexes
      connectionObject.connection.dropCollection(collectionName, function dropCollection(err) {
        // Don't error if droping a collection which doesn't exist
        if (err && err.errmsg === 'ns not found') {
          return cb();
        }

        if (err) {
          return cb(err);
        }

        cb();
      });
    },


    //  ╔╗╔╔═╗╔╦╗╦╦  ╦╔═╗
    //  ║║║╠═╣ ║ ║╚╗╔╝║╣
    //  ╝╚╝╩ ╩ ╩ ╩ ╚╝ ╚═╝
    //
    // Give access to a native mongo collection object for running custom
    // queries. It's preferred to just require machinepack-mongodb in the
    // future.
    native: function native(connectionName, collectionName, cb) {
      var connectionObject = connections[connectionName];
      cb(null, connectionObject.connection.db.collection(collectionName));
    },


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣    ║║║ ║║  ║ ║║║║║╣ ║║║ ║
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩
    //
    // Insert a single document into a collection.
    create: function create(connectionName, collectionName, data, cb) {
      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];

      // Insert a new document into the collection
      collection.insert(data, function insert(err, results) {
        if (err) {
          return cb(err);
        }

        cb(null, results[0]);
      });
    },


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ╔╗ ╔═╗╔╦╗╔═╗╦ ╦  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   ╠╩╗╠═╣ ║ ║  ╠═╣   ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ╚═╝╩ ╩ ╩ ╚═╝╩ ╩  ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
    //
    // Insert multiple documents into a collection.
    // Runs create behind the scenes.
    createEach: function create(connectionName, collectionName, data, cb) {
      if (data.length === 0) {
        return cb(null, []);
      }

      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];

      // Insert a new document into the collection
      collection.insert(data, function insert(err, results) {
        if (err) {
          return cb(err);
        }

        cb(null, results);
      });
    },


    //  ╔═╗╦╔╗╔╔╦╗  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
    //  ╠╣ ║║║║ ║║   ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
    //  ╚  ╩╝╚╝═╩╝  ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
    //
    // Find all matching documents in a colletion.
    find: function find(connectionName, collectionName, options, cb) {
      options = options || {};
      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];

      // Find all matching documents
      collection.find(options, cb);
    },


    //  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
    //  ║ ║╠═╝ ║║╠═╣ ║ ║╣    ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
    //  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝  ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
    //
    // Update all documents matching a criteria object in a collection.
    update: function update(connectionName, collectionName, options, values, cb) {
      options = options || {};
      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];

      // Update matching documents
      collection.update(options, values, function update(err, results) {
        if (err) {
          return cb(err);
        }

        cb(null, results);
      });
    },


    //  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
    //   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝   ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
    //  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩   ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
    //
    // Destroy all documents matching a criteria object in a collection.
    destroy: function destroy(connectionName, collectionName, options, cb) {
      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];

      // Find matching documents
      collection.find(options, function find(err, results) {
        if (err) {
          return cb(err);
        }

        // Destroy matching documents
        collection.destroy(options, function destroy(err) {
          if (err) {
            return cb(err);
          }

          cb(null, results);
        });
      });
    },


    //  ╔═╗╔═╗╦ ╦╔╗╔╔╦╗  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
    //  ║  ║ ║║ ║║║║ ║    ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
    //  ╚═╝╚═╝╚═╝╝╚╝ ╩   ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
    //
    // Return a count of the number of records matching a criteria.
    count: function count(connectionName, collectionName, options, cb) {
      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];

      // Find matching documents and return the count
      collection.count(options, function count(err, results) {
        if (err) {
          return cb(err);
        }

        cb(null, results);
      });
    },


    //   ╦╔═╗╦╔╗╔
    //   ║║ ║║║║║
    //  ╚╝╚═╝╩╝╚╝
    //
    // Peforms a "join" between 2-3 mongo collections when Waterline core needs
    // to satisfy a `.populate()`.
    join: function join(connectionName, collectionName, criteria, cb) {
      // Ignore `select` from waterline core
      if (typeof criteria === 'object') {
        delete criteria.select;
      }

      // var connectionObject = connections[connectionName];
      // var collection = connectionObject.collections[collectionName];

      // Populate associated records for each parent result
      // (or do them all at once as an optimization, if possible)
      Cursor({

        instructions: criteria,
        parentCollection: collectionName,


        //  ╔═╗╦ ╦╦═╗╔═╗╔═╗╦═╗  ╔═╗╦╔╗╔╔╦╗
        //  ║  ║ ║╠╦╝╚═╗║ ║╠╦╝  ╠╣ ║║║║ ║║
        //  ╚═╝╚═╝╩╚═╚═╝╚═╝╩╚═  ╚  ╩╝╚╝═╩╝
        //
        // Find some records directly (using only this adapter) from the
        // specified collection.
        $find: function $find(collectionIdentity, criteria, cb) {
          var connectionObject = connections[connectionName];
          var collection = connectionObject.collections[collectionIdentity];
          return collection.find(criteria, cb);
        },


        //  ╔═╗╦ ╦╦═╗╔═╗╔═╗╦═╗  ╔═╗╔═╗╔╦╗  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦ ╦  ╦╔═╔═╗╦ ╦
        //  ║  ║ ║╠╦╝╚═╗║ ║╠╦╝  ║ ╦║╣  ║   ╠═╝╠╦╝║║║║╠═╣╠╦╝╚╦╝  ╠╩╗║╣ ╚╦╝
        //  ╚═╝╚═╝╩╚═╚═╝╚═╝╩╚═  ╚═╝╚═╝ ╩   ╩  ╩╚═╩╩ ╩╩ ╩╩╚═ ╩   ╩ ╩╚═╝ ╩
        //
        // Look up the name of the primary key field or the collection with the
        // specified identity.
        $getPK: function $getPK(collectionIdentity) {
          if (!collectionIdentity) {
            return;
          }

          var connectionObject = connections[connectionName];
          var collection = connectionObject.collections[collectionIdentity];
          return collection._getPK();
        }
      }, cb);
    },


    //  ╔═╗╔╦╗╦═╗╔═╗╔═╗╔╦╗
    //  ╚═╗ ║ ╠╦╝║╣ ╠═╣║║║
    //  ╚═╝ ╩ ╩╚═╚═╝╩ ╩╩ ╩
    //
    // Stream one or more documents from the collection.
    stream: function stream(connectionName, collectionName, options, stream) {
      var connectionObject = connections[connectionName];
      var collection = connectionObject.collections[collectionName];

      collection.stream(options, stream);
    },


    identity: 'sails-mongo'
  };

  return adapter;
})();
