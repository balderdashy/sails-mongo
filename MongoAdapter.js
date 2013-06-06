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
    ObjectID = require('mongodb').ObjectID;

module.exports = (function() {

  // Keep track of all the dbs used by the app
  var dbs = {};

  // Holds an open connection
  var connection = {};

  var adapter = {
    syncable: true, // to track schema internally

    defaults: {
      host: 'localhost',
      db: 'sails',
      port: 27017
    },

    registerCollection: function(collection, cb) {
      var self = this;

      // If the configuration in this collection corresponds
      // with a known database, reuse it the connection(s) to that db
      dbs[collection.identity] = _.find(dbs, function(db) {
        return collection.db === db.db;
      });

      // Otherwise initialize for the first time
      if (!dbs[collection.identity]) {
        dbs[collection.identity] = marshalConfig(collection);
      }

      // Holds the Schema
      dbs[collection.identity].schema = {};

      return cb();
    },

    teardown: function(cb) {
      cb && cb();
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
      }, dbs[collectionName], cb);
    },

    drop: function(collectionName, cb) {
      spawnConnection(function __DROP__(connection, cb) {
        connection.dropCollection(collectionName, function __DEFINE__(err, result) {
          if (err) return cb(err);
          cb(null, result);
        });
      }, dbs[collectionName], cb);
    },

    create: function(collectionName, data, cb) {
      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          collection.insert(data, function(err, results) {
            if (err) return cb(err);
            cb(err, rewriteIds(results)[0]);
          });
        });
      }, dbs[collectionName], cb);
    },

    createEach: function(collectionName, data, cb) {
      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          collection.insert(data, function(err, results) {
            if (err) return cb(err);
            cb(null, rewriteIds(results));
          });
        });
      }, dbs[collectionName], cb);
    },

    find: function(collectionName, options, cb) {
      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          // Transform criteria to a mongo query
          options = rewriteCriteria(options);

          collection.find.apply(collection, parseFindOptions(options)).toArray(function(err, docs) {
            cb(err, rewriteIds(docs));
          });
        });
      }, dbs[collectionName], cb);
    },

    update: function(collectionName, options, values, cb) {
      var self = this;

      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          // Transform criteria to a mongo query
          options = rewriteCriteria(options);

          // Transform values to a mongo query
          values = rewriteValues(values);

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
              collection.find({ _id: { $in: updatedRecords }}).toArray(function(err, records) {
                if(err) return cb(err);
                cb(null, rewriteIds(records));
              });
            });
          });
        });
      }, dbs[collectionName], cb);
    },

    destroy: function(collectionName, options, cb) {
      spawnConnection(function(connection, cb) {
        connection.collection(collectionName, function(err, collection) {
          if (err) return cb(err);

          // Transform criteria to a mongo query
          options = rewriteCriteria(options);

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

            cb(null, rewriteIds(resultArray));
          });
        });
      }, dbs[collectionName], cb);
    },

    identity: 'sails-mongo'
  };

  function spawnConnection(logic, config, cb) {
    // Grab the existing connection
    if(Object.keys(connection).length > 0) {
      return afterwards();
    }

    var server = new Server(config.host, config.port, {native_parser: false});
    var db = new Db(config.db, server, {safe: true, native_parser: false});

    db.open(function(err) {
      if (err) return cb(err);

      connection = db;
      afterwards();
    });

    function afterwards() {
      logic(connection, function(err, result) {
        cb(err, result);
      });
    }
  }

  // Convert standard adapter config
  // into a custom configuration object

  function marshalConfig(config) {
    return _.extend(config, {
      url : config.url
    });
  }

  function parseFindOptions(options) {
    return [options.where, _.omit(options, 'where')];
  }

  function rewriteCriteria(options) {
    if (options.where) {
      if (options.where.id && !options.where._id) {
        options.where._id = options.where.id;
        delete options.where.id;
      }
      if (options.where._id && _.isString(options.where._id)) {
        options.where._id = new ObjectId(options.where._id);
      }

      options.where = parseTypes(options.where);
      options = normalizeCriteria(options);
    }
    return options;
  }

  // Rewrite values when used with Atomic operators
  function rewriteValues(values){
        var _values = {};
        var _$set = {};
        _.each(values,function(e,i){
            if(!_.isNaN(i) && i.indexOf("$")===0){
                _values[i] = e;
            }
            else {
                _$set[i]=e;
            }
        });
        if(!_.isEmpty(_$set)){
            _values["$set"] = _$set;
        }
        return _values;
    }

  function parseTypes(obj) {
    // Rewrite false and true if they come through. Not sure if there
    // is a better way to do this or not.
    _.each(obj, function(val, key) {
      if (val === "false")
        obj[key] = false;
      else if (val === "true")
        obj[key] = true;
      else if (_.isNumber(val))
        obj[key] = obj[key];
      else if (!_.isNaN(Date.parse(val)))
        obj[key] = new Date(val);
      else if (_.isArray(val))
        obj[key] = { $in: val };
      else if (_.isObject(val))
        obj[key] = parseTypes(val); // Nested objects...
    });

    return obj;
  }

  function normalizeCriteria(query) {

    // Loop through each criteria attribute and normalize what it's looking for
    Object.keys(query).forEach(function(key) {
      var original = _.clone(query[key]);

      var parent;

      var recursiveParse = function(obj) {

        // Check if value is an object, if so just grab the first key
        if(_.isObject(obj)) {
          Object.keys(obj).forEach(function(criteria) {
            var val;

            // Recursivly Parse
            if(_.isObject(obj[criteria])) {
              parent = criteria;
              recursiveParse(obj[criteria]);
            }

            // Escape any special regex characters
            // obj[criteria] = escapeRegex(obj[criteria]);

            // Handle Sorting Order with binary or -1/1 values
            if(key === 'sort') {
              obj[criteria] = ([0, -1].indexOf(obj[criteria]) > -1) ? -1 : 1;
            }

            if(criteria === 'contains') {
              val = obj[criteria];
              delete original[parent];
              original[parent] =  '.*' + val + '.*';
              original[parent] = caseInsensitive(escapeRegex(original[parent]));
              return;
            }

            if(criteria === 'like') {

              if(_.isObject(obj[criteria])) {
                Object.keys(obj[criteria]).forEach(function(key) {
                  original[key] = original[parent][key];
                });

                delete original[parent];
                return;
              }

              // Handle non-objects
              original[parent] = obj[criteria];
              delete original[criteria];

              return;
            }

            if(criteria === 'startsWith') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = val + '.*';
              original[parent] = caseInsensitive(escapeRegex(original[parent]));
              return;
            }

            if(criteria === 'endsWith') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = '.*' + val;
              original[parent] = caseInsensitive(escapeRegex(original[parent]));
              return;
            }

            if(criteria === 'lessThan' || criteria === '<') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$lt': val };
              return;
            }

            if(criteria === 'lessThanOrEqual' || criteria === '<=') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$lte': val };
              return;
            }

            if(criteria === 'greaterThan' || criteria === '>') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$gt': val };
              return;
            }

            if(criteria === 'greaterThanOrEqual' || criteria === '>=') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$gte': val };
              return;
            }

            if(criteria.toLowerCase() === 'not' || criteria === '!') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$ne': val };
            }

            // Replace Percent Signs
            if(typeof obj[criteria] === 'string') {
              obj[criteria] = obj[criteria].replace(/%/g, '.*');
            }

            // Wrap in case insensitive regex
            obj[criteria] = caseInsensitive(escapeRegex(obj[criteria]));
          });

          return;
        }

        // Just case insensitive regex a string
        obj[key] = caseInsensitive(escapeRegex(obj[key]));
      };

      // Kick off parsing
      recursiveParse(original);
      query[key] = original;
    });

    return query;
  }

  // case insensitive (really bad for production!)
  // won't use any indexes!
  function caseInsensitive(val) {
    if(!_.isString(val)) return val;
    return new RegExp('^' + val + '$', 'i');
  }

  function escapeRegex(val) {
    if(!_.isString(val)) return val;
    return val.replace(/[-[\]{}()+?,\\^$|#]/g, "\\$&");
  }

  function rewriteIds(models) {
    return _.map(models, function(model) {
      if (model._id) {
        model.id = model._id;
        delete model._id;
      }
      return model;
    });
  }

  return adapter;
})();
