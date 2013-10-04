/*---------------------------------------------------------------
  :: sails-mongo
  -> adapter
---------------------------------------------------------------*/

var Connection = require('./connection'),
    Collection = require('./collection');

module.exports = (function() {

  // Keep track of all the dbs used by the app
  var dbs = {};

  var adapter = {
    syncable: true, // to track schema internally

    defaults: {
      host: 'localhost',
      database: 'sails',
      port: 27017,
      user: null,
      password: null,
      schema: false,
      nativeParser: false,
      safe: true,
      url: null
    },

    /**
     * Register a Collection Object into the DBs library
     */

    registerCollection: function(collection, cb) {
      var coll = new Collection(collection);
      dbs[coll.identity] = coll;

      return cb();
    },

    /**
     * Noop Teardown Function
     */

    teardown: function(cb) {
      if(cb) cb();
    },

    /**
     * Return the Schema of a collection after first creating the collection
     * and indexes if they don't exist.
     */

    describe: function(collectionName, cb) {
      var name = collectionName.toLowerCase(),
          collection = dbs[name],
          schema = collection.schema;

      // Don't create the virtual join tables
      if(collection.joinTable) return cb(null, schema);

      this.define(collectionName, schema, function(err) {
        if(err) return cb(err);
        cb(null, schema);
      });
    },

    /**
     * Create a new Mongo Collection and set Index Values
     */

    define: function(collectionName, definition, cb) {
      var name = collectionName.toLowerCase(),
          collection = dbs[name],
          connection = new Connection(collection.config);

      // Create the collection and indexes
      connection.createCollection(name, collection, cb);
    },

    /**
     * Drop a Collection
     */

    drop: function(collectionName, cb) {
      var name = collectionName.toLowerCase(),
          collection = dbs[name],
          connection = new Connection(collection.config);

      // Ignore virtual "join" tables, they are never created
      if(collection.joinTable) return cb();

      // Drop the collection and indexes
      connection.dropCollection(name, cb);
    },

    /**
     * Give access to a native mongo collection object for running custom
     * queries.
     */

    native: function(collectionName, cb) {
      var name = collectionName.toLowerCase(),
          collection = dbs[name],
          connection = new Connection(collection.config);

      connection.open(function(err) {
        var collection = connection.database.collection(name);
        cb(err, collection);
      });
    },

    /**
     * Insert a single document into a collection.
     */

    create: function(collectionName, data, cb) {
      var name = collectionName.toLowerCase(),
          collection = dbs[name];

      // Insert a new document into the collection
      collection.insert(data, function(err, results) {
        if(err) return cb(err);
        cb(null, results[0]);
      });
    },

    /**
     * Insert an array of documents into a collection.
     */

    createEach: function(collectionName, data, cb) {
      var name = collectionName.toLowerCase(),
          collection = dbs[name];

      // Insert a new document into the collection
      collection.insert(data, function(err, results) {
        if(err) return cb(err);
        cb(null, results);
      });
    },

    /**
     * Find all matching documents in a colletion.
     */

    find: function(collectionName, options, cb) {
      var name = collectionName.toLowerCase(),
          collection = dbs[name];

      // Find all matching documents
      collection.find(options, function(err, results) {
        if(err) return cb(err);
        cb(null, results);
      });
    },

    /*
     * Update all documents matching a criteria object in a collection.
     */

    update: function(collectionName, options, values, cb) {
      var name = collectionName.toLowerCase(),
          collection = dbs[name];

      // Update matching documents
      collection.update(options, values, function(err, results) {
        if(err) return cb(err);
        cb(null, results);
      });
    },

    /**
     * Destroy all documents matching a criteria object in a collection.
     */

    destroy: function(collectionName, options, cb) {
      var name = collectionName.toLowerCase(),
          collection = dbs[name];

      // Destroy matching documents
      collection.destroy(options, function(err, results) {
        if(err) return cb(err);
        cb(null, results);
      });
    },

    identity: 'sails-mongo'
  };

  return adapter;
})();
