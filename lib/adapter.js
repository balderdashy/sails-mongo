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
    ReplSet = require('mongodb').ReplSet,
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
      user: null,
      password: null,
      schema: false,
      nativeParser: false,
      safe: true,
      url: null,
      replSet: {}
    },

    registerCollection: function(collection, cb) {
      var self = this;

      // Load the url connection parameters if set
      collection.config = utils.parseUrl(collection.config);

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

                return collection.ensureIndex(index, { sparse: true }, function(err) {
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

          // Handle an ID passed in so that we don't end up with both _id and id properties
          if(data.id) {

            // Check if data.id looks like a MongoID
            if (_.isString(data.id) && data.id.match(/^[a-fA-F0-9]{24}$/)) {
              data._id = new mongodb.ObjectID.createFromHexString(data.id);
            }

            // Else just pass thru to data._id
            else {
              data._id = data.id;
            }

            delete data.id;
          };

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

          if(Array.isArray(data)) {

            data.forEach(function(val) {

              // Handle an ID passed in so that we don't end up with both _id and id properties
              if(val.id) {

                // Check if val.id looks like a MongoID
                if (_.isString(val.id) && val.id.match(/^[a-fA-F0-9]{24}$/)) {
                  val._id = new mongodb.ObjectID.createFromHexString(val.id);
                }

                // Else just pass thru to val._id
                else {
                  val._id = val.id;
                }

                delete val.id;
              };
            });
          }

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
          if(options.groupBy || options.sum || options.average || options.min || options.max) {

            // Check if we have calculations to do
            if(!options.sum && !options.average && !options.min && !options.max) {
              return cb(new Error('Cannot groupBy without a calculation'));
            }

            var groupBy;
            if (options.groupBy) {
              groupBy = {};
              options.groupBy.forEach(function(key){
                groupBy[key] = '$' + key;
              });
            } else {
              groupBy = null;
            }

            var aggregateGroup = { _id: groupBy};

            if (options.sum instanceof Array) {
              options.sum.forEach(function(opt){
                aggregateGroup[opt] = { $sum: '$' + opt }
              });
            }

            if (options.average instanceof Array) {
              options.average.forEach(function(opt){
                aggregateGroup[opt] = { $avg: '$' + opt }
              });
            }

            if (options.min instanceof Array) {
              options.min.forEach(function(opt){
                aggregateGroup[opt] = { $min: '$' + opt }
              });
            }

            if (options.max instanceof Array) {
              options.max.forEach(function(opt){
                aggregateGroup[opt] = { $max: '$' + opt }
              });
            }

            // Order matters, $match must come before $group in the object
            var aggregate = [];

            // Rewrite where criteria
            if(options.where) {
              var where = {where: options.where };
              options.where = criteria.rewriteCriteria(where, schemaStash[collectionName]).where;
              aggregate.push({$match: options.where});
            }

            aggregate.push({$group: aggregateGroup});

            collection.aggregate(aggregate, function(err, results){
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
            options = criteria.rewriteCriteria(options, schemaStash[collectionName]);

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

          // Mongo doesn't allow ID's to be updated
          if(values.id) delete values.id;
          if(values._id) delete values._id;

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
      if(err) console.log(err);
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
    var safe = config.safe ? 1 : 0,
        serverOptions = {native_parser: config.nativeParser, auth: { user: config.user, password: config.password }},
        server;

    if (config.replSet && Array.isArray(config.replSet.servers) && config.replSet.servers.length) {
      var replSet = [];

      replSet.push(new Server( config.host, config.port));

      config.replSet.servers.forEach(function(server) {
        replSet.push(new Server( server.host, server.port || config.port));
      });

      _.extend(serverOptions, config.replSet.options || {});

      server = new ReplSet(replSet, serverOptions);
    }
    else {
      server = new Server(config.host, config.port, serverOptions);
    }

    var db = new Db(config.database, server, {w: safe, native_parser: config.nativeParser});

    db.open(function(err) {
      if (err) return cb(err);

      if (serverOptions.auth.user && serverOptions.auth.password) {
        return db.authenticate(serverOptions.auth.user, serverOptions.auth.password, function(err, success) {
          if (success) return cb(null, db);
          if (db) db.close();
          return cb(err ? err : new Error('Could not authenticate user ' + auth[0]), null);
        });
      }

      return cb(null, db);
    });
  }

  return adapter;
})();
