/*---------------------------------------------------------------
  :: sails-mongo
  -> adapter
---------------------------------------------------------------*/

var async = require('async')
, _       = require('underscore')
, mongodb = require('mongodb')
, mongoClient = mongodb.MongoClient
, objectId = mongodb.ObjectID;

module.exports = (function() {

  // Keep track of all the dbs used by the app
  var dbs = {};

  var adapter = {
    syncable: false,

    registerCollection: function(collection, cb) {
      var self = this;

      // If the configuration in this collection corresponds
      // with a known database, reuse it the connection(s) to that db
      dbs[collection.identity] = _.find(dbs, function(db) {
        return collection.url === db.url;
      });

      // Otherwise initialize for the first time
      if (!dbs[collection.identity]) {
        dbs[collection.identity] = marshalConfig(collection);
      }

      return cb();
    },

    teardown: function(cb) {
      cb && cb();
    },

    describe: function(collectionName, cb) {
      //It's mongo -- there's nothing to describe
      return cb(null, {});
    },

    define: function(collectionName, definition, cb) {
      spawnConnection(function __DEFINE__(connection, cb) {
        connection.createCollection(collectionName, function __DEFINE__(err, result) {
          if (err) return cb(err);
          cb(null, result);
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
        var collection = connection.collection(collectionName);
        collection.insert(data, function(err, result) {
          if (err) return cb(err);

          // Build model to return
          var model = _.extend({}, data, {

            // TODO: look up the autoIncrement attribute and increment that instead of assuming `id`
            id: result[0]._id
          });

          if (model._id)
            delete model._id;

          cb(err, model);
        });
      }, dbs[collectionName], cb);
    },

    find: function(collectionName, options, cb) {
      spawnConnection(function(connection, cb) {
        var collection = connection.collection(collectionName);
        options = rewriteCriteria(options);
        collection.find.apply(collection, parseFindOptions(options)).toArray(function(err, docs) {
          cb(err, rewriteIds(docs));
        });
      }, dbs[collectionName], cb);
    },

    update: function(collectionName, options, values, cb) {
      var that = this;

      spawnConnection(function(connection, cb) {
        options = rewriteCriteria(options);
        values = rewriteValues(values);
        var collection = connection.collection(collectionName);
        collection.update(options.where, values, { multi: true }, function(err, result) {
          if (!err) {
            that.find(collectionName, options, function(err, docs) {
              cb(err, docs);
            });
          } else {
            cb(err, result);
          }
        });
      }, dbs[collectionName], cb);
    },

    destroy: function(collectionName, options, cb) {
      spawnConnection(function(connection, cb) {
        options = rewriteCriteria(options);
        var collection = connection.collection(collectionName);
        collection.remove(options.where, function(err, result) {
          cb(err, result);
        });
      }, dbs[collectionName], cb);
    },

    identity: 'sails-mongo'
  };

  function spawnConnection(logic, config, cb) {
    mongoClient.connect(config.url, function(err, db) {
      afterwards(err, db);
    });

    function afterwards(err, db) {
      if (err) return cb(err);
      logic(db, function(err, result) {
        db.close();
        cb && cb(err, result);
      });
    }
  };

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
        options.where._id = new objectId(options.where._id);
      }

      options.where = parseTypes(options.where);
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
      else if (!_.isNaN(Date.parse(val)))
        obj[key] = new Date(val);
      else if (_.isObject(val))
        obj[key] = parseTypes(val); // Nested objects...
    });

    return obj;
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
