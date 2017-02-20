/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var async = require('async');
var Helpers = require('../helpers');

//  ███████╗ █████╗ ██╗██╗     ███████╗      ███╗   ███╗ ██████╗ ███╗   ██╗ ██████╗  ██████╗
//  ██╔════╝██╔══██╗██║██║     ██╔════╝      ████╗ ████║██╔═══██╗████╗  ██║██╔════╝ ██╔═══██╗
//  ███████╗███████║██║██║     ███████╗█████╗██╔████╔██║██║   ██║██╔██╗ ██║██║  ███╗██║   ██║
//  ╚════██║██╔══██║██║██║     ╚════██║╚════╝██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║██║   ██║
//  ███████║██║  ██║██║███████╗███████║      ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║╚██████╔╝╚██████╔╝
//  ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝      ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝
//
// Waterline adapter for the MongoDB database.


// Keep track of all the datastores registered by the adapter (for the entire Node process).
var datastores = {};

// Keep track of all the model definitions registered by the adapter (for the entire Node process).
var modelDefinitions = {};


// Expose the adapter definition.
module.exports = {

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
  // Register a datastore config and create a connection manager for it.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: pull this into Waterline core.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  registerDatastore: function registerDatastore(datastoreConfig, models, cb) {
    var identity = datastoreConfig.identity;
    if (!identity) {
      return cb(new Error('Invalid datastore config. A datastore should contain a unique identity property.'));
    }

    Helpers.registerDatastore({
      identity: identity,
      config: datastoreConfig,
      models: models,
      datastores: datastores,
      modelDefinitions: modelDefinitions
    }, {
      error: function error(err) {
        return cb(err);
      },
      badConfiguration: function badConfiguration(err) {
        return cb(err);
      },
      success: function success(metaMaybe) {
        return cb(undefined, metaMaybe);
      }
    });
  },


  //  ╔╦╗╔═╗╔═╗╦═╗╔╦╗╔═╗╦ ╦╔╗╔  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐
  //   ║ ║╣ ╠═╣╠╦╝ ║║║ ║║║║║║║   ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤
  //   ╩ ╚═╝╩ ╩╩╚══╩╝╚═╝╚╩╝╝╚╝  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘
  // Clean up a datastore, destroying a connection manager and closing any connections in its pool.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: pull this into Waterline core.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  teardown: function teardown(identity, cb) {
    var datastoreIdentities = [];

    // If no specific identity was sent, teardown all the datastores
    if (!identity) {
      datastoreIdentities = datastoreIdentities.concat(_.keys(datastores));
    } else {
      datastoreIdentities.push(identity);
    }

    // Teardown each datastore.
    // (Note that we track the `report.meta` that comes back on success, if any.)
    var teardownMetasMaybe;
    async.eachSeries(datastoreIdentities, function eachDatastore_(datastoreIdentity, next) {
      Helpers.teardown({
        identity: datastoreIdentity,
        datastores: datastores,
        modelDefinitions: modelDefinitions
      }, {
        error: function (err) { return next(err); },
        success: function (metaMaybe) {
          if (metaMaybe) {
            teardownMetasMaybe = teardownMetasMaybe || {};
            teardownMetasMaybe[datastoreIdentity] = metaMaybe;
          }//>-
          return next();
        }
      });
    }, function asyncCb_(err) {
      if (err) { return cb(err); }
      return cb(undefined, teardownMetasMaybe);
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
  create: function create(datastoreName, s3q, cb) {
    var datastore = datastores[datastoreName];
    var models = modelDefinitions[datastoreName];
    Helpers.create({
      datastore: datastore,
      models: models,
      query: s3q
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
  createEach: function createEach(datastoreName, s3q, cb) {
    var datastore = datastores[datastoreName];
    var models = modelDefinitions[datastoreName];
    Helpers.createEach({
      datastore: datastore,
      models: models,
      query: s3q
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
  update: function update(datastoreName, s3q, cb) {
    var datastore = datastores[datastoreName];
    var models = modelDefinitions[datastoreName];
    Helpers.update({
      datastore: datastore,
      models: models,
      query: s3q
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
  destroy: function destroy(datastoreName, s3q, cb) {
    var datastore = datastores[datastoreName];
    var models = modelDefinitions[datastoreName];
    Helpers.destroy({
      datastore: datastore,
      models: models,
      query: s3q
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

  //  ╔═╗╦╔╗╔╔╦╗
  //  ╠╣ ║║║║ ║║
  //  ╚  ╩╝╚╝═╩╝
  // Find matching (physical-layer) records.
  find: function find(datastoreName, s3q, cb) {
    var datastore = datastores[datastoreName];
    var models = modelDefinitions[datastoreName];
    Helpers.select({
      datastore: datastore,
      models: models,
      query: s3q
    }).exec({
      error: function (err) {
        return cb(err);
      },
      success: function (report) {
        return cb(undefined, report.records);
      }
    });
  },

  //  ╔═╗╦  ╦╔═╗
  //  ╠═╣╚╗╔╝║ ╦
  //  ╩ ╩ ╚╝ ╚═╝
  avg: function avg(datastoreName, s3q, cb) {
    var datastore = datastores[datastoreName];
    var models = modelDefinitions[datastoreName];
    Helpers.avg({
      datastore: datastore,
      models: models,
      query: s3q
    }).exec({
      error: function (err) {
        return cb(err);
      },
      success: function (mean) {
        return cb(undefined, mean);
      }
    });
  },


  //  ╔═╗╦ ╦╔╦╗
  //  ╚═╗║ ║║║║
  //  ╚═╝╚═╝╩ ╩
  sum: function sum(datastoreName, s3q, cb) {
    var datastore = datastores[datastoreName];
    var models = modelDefinitions[datastoreName];
    Helpers.sum({
      datastore: datastore,
      models: models,
      query: s3q
    }).exec({
      error: function (err) {
        return cb(err);
      },
      success: function (total) {
        return cb(undefined, total);
      }
    });
  },


  //  ╔═╗╔═╗╦ ╦╔╗╔╔╦╗
  //  ║  ║ ║║ ║║║║ ║
  //  ╚═╝╚═╝╚═╝╝╚╝ ╩
  // Return the number of matching records.
  count: function count(datastoreName, s3q, cb) {
    var datastore = datastores[datastoreName];
    var models = modelDefinitions[datastoreName];
    Helpers.count({
      datastore: datastore,
      models: models,
      query: s3q
    }).exec({
      error: function (err) {
        return cb(err);
      },
      success: function (numRecords) {
        return cb(undefined, numRecords);
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
  define: function define(datastoreName, tableName, definition, cb) {
    // TODO: verify that the second argument here is actually the table name and not the model identity or anything like that.
    var datastore = datastores[datastoreName];
    Helpers.define({
      datastore: datastore,
      tableName: tableName,
      definition: definition
    }).exec({
      error: function error(err) {
        return cb(err);
      },
      success: function success(metaMaybe) {
        return cb(undefined, metaMaybe);
      }
    });
  },


  //  ╔╦╗╦═╗╔═╗╔═╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
  //   ║║╠╦╝║ ║╠═╝  │  │ ││  │  ├┤ │   │ ││ ││││
  //  ═╩╝╩╚═╚═╝╩    └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘
  // Remove a collection from the mongo database.
  drop: function drop(datastoreName, tableName, unused, cb) {
    // TODO: verify that the second argument here is actually the table name and not the model identity or anything like that.
    var datastore = datastores[datastoreName];
    var mongoCollection = datastore.manager.collection(tableName);
    mongoCollection.drop(function dropCb(err) {
      if (err) {
        // Ignore errors that occur because the Mongo collection doesn't exist.
        if (err.errmsg === 'ns not found') {
          return cb();
        }

        return cb(err);
      }//-•

      return cb();
    });
  }

};
