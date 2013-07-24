/*---------------------------------------------------------------
  :: sails-mongo
  -> adapter
---------------------------------------------------------------*/

var async = require('async'),
    _ = require('underscore'),
    mongodb = require('mongodb'),
    Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    utils = require('./utils'),
    criteria = require('./criteria');

module.exports = (function() {

  // Keep track of all the dbs used by the app
  var dbs = {},
      schemaStash = {};

  // Holds an open connection
  var connection = {};

  var adapter = {
    syncable: true, // to track schema internally

    defaults: {
      host: 'localhost',
      database: 'sails',
      port: 27017,
      schema: false,
      nativeParser: false,
      safe: true
    },

    registerCollection: function(collection, cb) {
      var self = this;

      // If the configuration in this collection corresponds
      // with a known database, reuse it the connection(s) to that db
      dbs[collection.identity] = _.find(dbs, function(db) {
        return collection.database === db.database;
      });

      // Otherwise initialize for the first time
      if (!dbs[collection.identity]) {
        dbs[collection.identity] = collection;
      }

      // Holds the Schema
      dbs[collection.identity].schema = {};
      schemaStash[collection.identity] = collection.definition;

      return cb();
    },

    teardown: function(cb) {
      if(cb) cb();
    },

    describe: function(collectionName, cb) {
      var des = Object.keys(dbs[collectionName].schema).length === 0 ?
        null : dbs[collectionName].schema;
      return cb(null, des);
    },

    define: function(collectionName, definition, cb) {
      spawnConnection(function __DEFINE__(connection, cb) {
        connection.createCollection(collectionName, function __DEFINE__(err, result) {
          if (err) return cb(err);

          // Use the collection to perform index queries
          connection.collection(collectionName, function(err, collection) {
            var index;

            // Clone the definition
            var def = _.clone(definition);

            function processKey(key, cb) {

              // Remove any autoIncement keys, Mongo won't support them without
              // a hacky additional collection
              if(def[key].autoIncrement) {
                delete def[key].autoIncrement;
              }

              // Handle Unique Key
              if(def[key].unique) {
                index = {};
                index[key] = 1;

                return collection.ensureIndex(index, { unique: true, sparse: true }, function(err) {
                  if(err) return cb(err);
                  def[key].indexed = true;
                  cb();
                });
              }

              // Add non-unique indexes
              if(def[key].index && !def[key].unique) {
                index = {};
                index[key] = 1;

                return collection.ensureIndex(index, { unique: true, sparse: true }, function(err) {
                  if(err) return cb(err);
                  def[key].indexed = true;
                  cb();
                });
              }

              return cb();
            }

            var keys = Object.keys(def);

            // Loop through the def and process attributes for each key
            async.forEach(keys, processKey, function(err) {
              if(err) return cb(err);
              dbs[collectionName].schema = def;
              cb(null, dbs[collectionName].schema);
            });
          });
        });
      }, dbs[collectionName].config, cb);
    },

    drop: function(collectionName, cb) {
      spawnConnection(function __DROP__(connection, cb) {
        connection.dropCollection(collectionName, function __DEFINE__(err, result) {
          if (err) return cb(err);
          cb(null, result);
        });
      }, dbs[collectionName].config, cb);
    },

    /**
     * Give access to a native mongo collection object for running custom
     * queries.
     *
     * Returns (err, collection, cb);
     */

    native: function(collectionName, cb) {

      if(Object.keys(connection).length > 0) {
        return afterwards();
      }

      createConnection(dbs[collectionName].config, function(err, db) {
        connection = db;
        afterwards();
      });

      function afterwards() {
        connection.collection(collectionName, function(err, collection) {
          return cb(err, collection);
        });
      }
    },

    create: function(collectionName, data, cb) {
      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          collection.insert(data, function(err, results) {
            if (err) return cb(err);
            cb(err, utils.rewriteIds(results)[0]);
          });
        });
      }, dbs[collectionName].config, cb);
    },

    createEach: function(collectionName, data, cb) {
      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          collection.insert(data, function(err, results) {
            if (err) return cb(err);
            cb(null, utils.rewriteIds(results));
          });
        });
      }, dbs[collectionName].config, cb);
    },

    find: function(collectionName, options, cb) {

      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);
          
          // If we are summing or averaging, we use an aggregate query
          if (options.groupBy || options.sum || options.average) {
            if(!options.sum && !options.average) {
              return cb(new Error('Cannot groupBy without a calculation'));
            }
            
            var groupBy;
            if (options.groupBy) {
              groupBy = {};
              options.groupBy.forEach(function(key){
                groupBy[key] = '$' + key;
              });
            } else {
              groupBy = '';
            }
            
            var aggregate = { _id: groupBy};

            if (options.sum instanceof Array) {
              options.sum.forEach(function(opt){
                aggregate[opt] = { $sum: '$'+opt }
              });
            }
            
            if (options.average instanceof Array) {
              options.average.forEach(function(opt){
                aggregate[opt] = { $avg: '$'+opt }
              });
            }

            collection.aggregate({
              $group: aggregate
            }, function(err, results){
              
              // Results have grouped by values under _id, so we extract them
              results = results.map(function(result){
                for(var key in result._id) {
                  result[key] = result._id[key];
                }
                delete result._id;
                return result;
              });

              cb(err, results); 
           });
          } else {
          
            // Transform criteria to a mongo query
            options = criteria.rewriteCriteria(options, dbs._schema[collectionName]);
              
            collection.find.apply(collection, criteria.parseFindOptions(options))
            .toArray(function(err, docs) {
              cb(err, utils.rewriteIds(docs));
            });
            
          }
        });
      }, dbs[collectionName].config, cb);
    },

    update: function(collectionName, options, values, cb) {
      var self = this;

      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          // Transform criteria to a mongo query
          options = criteria.rewriteCriteria(options);

          // Transform values to a mongo query
          values = criteria.rewriteValues(values);

          // Lookup records being updated and grab their ID's
          // Useful for later looking up the record after an insert
          // Required because options may not contain an ID
          collection.find(options.where).toArray(function(err, records) {
            if(err) return cb(err);
            if(!records) return cb(new Error('Could not find any records to update'));

            // Build an array of records
            var updatedRecords = [];

            records.forEach(function(record) {
              updatedRecords.push(record._id);
            });

            // Update the records
            collection.update(options.where, values, { multi: true }, function(err, result) {
              if(err) return cb(err);

              // Look up newly inserted records to return the results of the update
              collection.find({ _id: { '$in': updatedRecords }}).toArray(function(err, records) {
                if(err) return cb(err);
                cb(null, utils.rewriteIds(records));
              });
            });
          });
        });
      }, dbs[collectionName].config, cb);
    },

    destroy: function(collectionName, options, cb) {
      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          // Transform criteria to a mongo query
          options = criteria.rewriteCriteria(options);

          collection.remove(options.where, function(err, results) {
            if(err) return cb(err);

            // Force to array to meet Waterline API
            var resultsArray = [];

            // If result is not an array return an array
            if(!Array.isArray(results)) {
              resultsArray.push({ id: results });
              return cb(null, resultsArray);
            }

            // Create a valid array of IDs
            results.forEach(function(result) {
              resultsArray.push({ id: result });
            });

            cb(null, utils.rewriteIds(resultArray));
          });
        });
      }, dbs[collectionName].config, cb);
    },

    // Stream one or more models from the collection
    // using where, limit, skip, and order
    // In where: handle `or`, `and`, and `like` queries
    stream: function(collectionName, options, stream) {
      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          // Transform criteria to a mongo query
          options = criteria.rewriteCriteria(options);

          var dbStream = collection.find.apply(collection, criteria.parseFindOptions(options)).stream();

          // For each data item
          dbStream.on('data', function(item) {

            // Pause stream
            dbStream.pause();

            var obj = utils.rewriteIds([item])[0];

            stream.write(obj, function() {
              dbStream.resume();
            });

          });

          // Handle error, an 'end' event will be emitted after this as well
          dbStream.on('error', function(err) {
            stream.end(err); // End stream
            cb(err); // Close connection
          });

          // all rows have been received
          dbStream.on('end', function() {
            stream.end();
            cb();
          });
        });
      }, dbs[collectionName].config);
    },

    identity: 'sails-mongo'
  };

  function spawnConnection(logic, config, cb) {

    // Grab the existing connection
    if(Object.keys(connection).length > 0) {
      return afterwards();
    }

    createConnection(config, function(err, db) {
      connection = db;
      afterwards();
    });

    function afterwards() {
      logic(connection, function(err, result) {
        if(cb) return cb(err, result);
      });
    }
  }

  function createConnection(config, cb) {
    var server = new Server(config.host, config.port, {native_parser: config.nativeParser});
    var db = new Db(config.database, server, {safe: config.safe, native_parser: config.nativeParser});

    db.open(function(err) {
      if (err) return cb(err);
      cb(null, db);
    });
  }

  return adapter;
})();
