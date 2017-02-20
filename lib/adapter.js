//  ███████╗ █████╗ ██╗██╗     ███████╗    ███╗   ███╗ ██████╗ ███╗   ██╗ ██████╗  ██████╗
//  ██╔════╝██╔══██╗██║██║     ██╔════╝    ████╗ ████║██╔═══██╗████╗  ██║██╔════╝ ██╔═══██╗
//  ███████╗███████║██║██║     ███████╗    ██╔████╔██║██║   ██║██╔██╗ ██║██║  ███╗██║   ██║
//  ╚════██║██╔══██║██║██║     ╚════██║    ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║██║   ██║
//  ███████║██║  ██║██║███████╗███████║    ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║╚██████╔╝╚██████╔╝
//  ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝
//
// An adapter for MongoDB and Waterline

var _ = require('@sailshq/lodash');
var async = require('async');
var Helpers = require('../helpers');

module.exports = (function sailsMongo() {
  // Keep track of all the datastores used by the app
  var datastores = {};

  // Keep track of all the connection model definitions
  var modelDefinitions = {};

  // The main adapter object.
  var adapter = {
    // The identity of this adapter, to be referenced by datastore configurations in a Sails app.
    identity: 'sails-mongo',

    // Waterline Adapter API Version
    adapterApiVersion: 1,

    // Default configuration for connections
    defaults: {
      schema: false
    },

    //  ╔═╗═╗ ╦╔═╗╔═╗╔═╗╔═╗  ┌─┐┬─┐┬┬  ┬┌─┐┌┬┐┌─┐
    //  ║╣ ╔╩╦╝╠═╝║ ║╚═╗║╣   ├─┘├┬┘│└┐┌┘├─┤ │ ├┤
    //  ╚═╝╩ ╚═╩  ╚═╝╚═╝╚═╝  ┴  ┴└─┴ └┘ ┴ ┴ ┴ └─┘
    //  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐┌─┐
    //   ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤ └─┐
    //  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘└─┘
    // This allows outside access to the datastores.
    datastores: datastores,

    //  ╦═╗╔═╗╔═╗╦╔═╗╔╦╗╔═╗╦═╗  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐
    //  ╠╦╝║╣ ║ ╦║╚═╗ ║ ║╣ ╠╦╝   ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤
    //  ╩╚═╚═╝╚═╝╩╚═╝ ╩ ╚═╝╩╚═  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘
    // Register a datastore config and generate a connection manager for it.
    registerDatastore: function registerDatastore(datastoreConfig, models, cb) {
      var identity = datastoreConfig.identity;
      if (!identity) {
        return cb(new Error('Invalid datastore config. A datastore should contain a unique identity property.'));
      }

      Helpers.registerDataStore({
        identity: identity,
        config: datastoreConfig,
        models: models,
        datastores: datastores,
        modelDefinitions: modelDefinitions
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        badConfiguration: function badConfiguration(err) {
          return cb(err);
        },
        success: function success() {
          return cb();
        }
      });
    },


    //  ╔╦╗╔═╗╔═╗╦═╗╔╦╗╔═╗╦ ╦╔╗╔  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //   ║ ║╣ ╠═╣╠╦╝ ║║║ ║║║║║║║  │  │ │││││││├┤ │   │ ││ ││││
    //   ╩ ╚═╝╩ ╩╩╚══╩╝╚═╝╚╩╝╝╚╝  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    // Destroy a manager and close any connections in it's pool.
    teardown: function teardown(identity, cb) {
      var datastoreIdentities = [];

      // If no specific identity was sent, teardown all the datastores
      if (!identity || _.isNull(identity)) {
        datastoreIdentities = datastoreIdentities.concat(_.keys(datastores));
      } else {
        datastoreIdentities.push(identity);
      }

      // Teardown each datastore identity manager
      async.eachSeries(datastoreIdentities, function teardownDatastore(datastoreIdentity, next) {
        Helpers.teardown({
          identity: datastoreIdentity,
          datastores: datastores,
          modelDefinitions: modelDefinitions
        }).exec({
          error: function error(err) {
            return next(err);
          },
          success: function success() {
            return next();
          }
        });
      }, function asyncCb(err) {
        cb(err);
      });
    },


    //  ██████╗ ███╗   ███╗██╗
    //  ██╔══██╗████╗ ████║██║
    //  ██║  ██║██╔████╔██║██║
    //  ██║  ██║██║╚██╔╝██║██║
    //  ██████╔╝██║ ╚═╝ ██║███████╗
    //  ╚═════╝ ╚═╝     ╚═╝╚══════╝
    //
    // Methods related to manipulating records in the database.

    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   ├┬┘├┤ │  │ │├┬┘ ││
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ┴└─└─┘└─┘└─┘┴└──┴┘
    // Add a new document to the collection.
    create: function create(datastoreName, query, cb) {
      var datastore = datastores[datastoreName];
      var models = modelDefinitions[datastoreName];
      Helpers.create({
        datastore: datastore,
        models: models,
        query: query
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        notUnique: function error(errInfo) {
          var e = new Error(errInfo.message);
          e.footprint = errInfo.footprint;
          return cb(e);
        },
        success: function success(report) {
          var record = report && report.record || undefined;
          return cb(undefined, record);
        }
      });
    },


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ╔═╗╔═╗╔═╗╦ ╦  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   ║╣ ╠═╣║  ╠═╣  ├┬┘├┤ │  │ │├┬┘ ││
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ╚═╝╩ ╩╚═╝╩ ╩  ┴└─└─┘└─┘└─┘┴└──┴┘
    // Add multiple new documents to the collection.
    createEach: function createEach(datastoreName, query, cb) {
      var datastore = datastores[datastoreName];
      var models = modelDefinitions[datastoreName];
      Helpers.createEach({
        datastore: datastore,
        models: models,
        query: query
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        notUnique: function error(errInfo) {
          var e = new Error(errInfo.message);
          e.footprint = errInfo.footprint;
          return cb(e);
        },
        success: function success(report) {
          var records = report && report.records || undefined;
          return cb(undefined, records);
        }
      });
    },


    //  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ║ ║╠═╝ ║║╠═╣ ║ ║╣   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝  └─┘└└─┘└─┘┴└─ ┴
    // Update one or more models in the table
    update: function update(datastoreName, query, cb) {
      var datastore = datastores[datastoreName];
      var models = modelDefinitions[datastoreName];
      Helpers.update({
        datastore: datastore,
        models: models,
        query: query
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        notUnique: function error(errInfo) {
          var e = new Error(errInfo.message);
          e.footprint = errInfo.footprint;
          return cb(e);
        },
        success: function success(report) {
          if (report) {
            return cb(undefined, report.records);
          }

          return cb();
        }
      });
    },


    //  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩   └─┘└└─┘└─┘┴└─ ┴
    // Delete one or more records in a table
    destroy: function destroy(datastoreName, query, cb) {
      var datastore = datastores[datastoreName];
      var models = modelDefinitions[datastoreName];
      Helpers.destroy({
        datastore: datastore,
        models: models,
        query: query
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        success: function success(report) {
          if (report) {
            return cb(undefined, report.records);
          }

          return cb();
        }
      });
    },

    //  ██████╗  ██████╗ ██╗
    //  ██╔══██╗██╔═══██╗██║
    //  ██║  ██║██║   ██║██║
    //  ██║  ██║██║▄▄ ██║██║
    //  ██████╔╝╚██████╔╝███████╗
    //  ╚═════╝  ╚══▀▀═╝ ╚══════╝
    //
    // Methods related to fetching records and obtaining information from the database.

    //  ╔═╗╔═╗╦  ╔═╗╔═╗╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╚═╗║╣ ║  ║╣ ║   ║   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╩═╝╚═╝╚═╝ ╩   └─┘└└─┘└─┘┴└─ ┴
    // Select Query Logic
    find: function find(datastoreName, query, cb) {
      var datastore = datastores[datastoreName];
      var models = modelDefinitions[datastoreName];
      Helpers.select({
        datastore: datastore,
        models: models,
        query: query
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        success: function success(report) {
          return cb(undefined, report.records);
        }
      });
    },

    //  ╔═╗╦  ╦╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠═╣╚╗╔╝║ ╦  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩ ╩ ╚╝ ╚═╝  └─┘└└─┘└─┘┴└─ ┴
    // Find out the average of the query.
    avg: function avg(datastoreName, query, cb) {
      var datastore = datastores[datastoreName];
      var models = modelDefinitions[datastoreName];
      Helpers.avg({
        datastore: datastore,
        models: models,
        query: query
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        success: function success(report) {
          return cb(undefined, report);
        }
      });
    },


    //  ╔═╗╦ ╦╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╚═╗║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╩ ╩  └─┘└└─┘└─┘┴└─ ┴
    // Find out the sum of the query.
    sum: function sum(datastoreName, query, cb) {
      var datastore = datastores[datastoreName];
      var models = modelDefinitions[datastoreName];
      Helpers.sum({
        datastore: datastore,
        models: models,
        query: query
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        success: function success(report) {
          return cb(undefined, report);
        }
      });
    },


    //  ╔═╗╔═╗╦ ╦╔╗╔╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ║  ║ ║║ ║║║║ ║   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╚═╝╝╚╝ ╩   └─┘└└─┘└─┘┴└─ ┴
    // Return the number of matching records.
    count: function count(datastoreName, query, cb) {
      var datastore = datastores[datastoreName];
      var models = modelDefinitions[datastoreName];
      Helpers.count({
        datastore: datastore,
        models: models,
        query: query
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        success: function success(report) {
          return cb(undefined, report);
        }
      });
    },


    //  ██████╗ ██████╗ ██╗
    //  ██╔══██╗██╔══██╗██║
    //  ██║  ██║██║  ██║██║
    //  ██║  ██║██║  ██║██║
    //  ██████╔╝██████╔╝███████╗
    //  ╚═════╝ ╚═════╝ ╚══════╝
    //
    // Methods related to modifying the underlying data structure of the
    // database.

    //  ╔╦╗╔═╗╔═╗╦╔╗╔╔═╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //   ║║║╣ ╠╣ ║║║║║╣   │  │ ││  │  ├┤ │   │ ││ ││││
    //  ═╩╝╚═╝╚  ╩╝╚╝╚═╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘
    // A no-op function in Mongo.
    define: function define(datastoreName, collectionName, definition, cb) {
      var datastore = datastores[datastoreName];
      Helpers.define({
        datastore: datastore,
        collectionName: collectionName,
        definition: definition
      }).exec({
        error: function error(err) {
          return cb(err);
        },
        success: function success(report) {
          return cb(undefined, report);
        }
      });
    },


    //  ╔╦╗╦═╗╔═╗╔═╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //   ║║╠╦╝║ ║╠═╝  │  │ ││  │  ├┤ │   │ ││ ││││
    //  ═╩╝╩╚═╚═╝╩    └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘
    // Remove a collection from the mongo database.
    drop: function drop(datastoreName, collectionName, relations, cb) {
      var datastore = datastores[datastoreName];
      var collection = datastore.manager.collection(collectionName);
      collection.drop(function dropCb(err) {
        if (err) {
          // Ignore errors when the collection doesn't exist
          if (err.errmsg === 'ns not found') {
            return cb();
          }

          return cb(err);
        }

        return cb();
      });
    }
  };

  // Expose adapter definition
  return adapter;
})();
