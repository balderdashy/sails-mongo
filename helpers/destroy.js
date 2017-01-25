//  ██████╗ ███████╗███████╗████████╗██████╗  ██████╗ ██╗   ██╗     █████╗  ██████╗████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗╚██╗ ██╔╝    ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║  ██║█████╗  ███████╗   ██║   ██████╔╝██║   ██║ ╚████╔╝     ███████║██║        ██║   ██║██║   ██║██╔██╗ ██║
//  ██║  ██║██╔══╝  ╚════██║   ██║   ██╔══██╗██║   ██║  ╚██╔╝      ██╔══██║██║        ██║   ██║██║   ██║██║╚██╗██║
//  ██████╔╝███████╗███████║   ██║   ██║  ██║╚██████╔╝   ██║       ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
//  ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝    ╚═╝       ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//

module.exports = require('machine').build({


  friendlyName: 'Destroy',


  description: 'Destroy record(s) in the database matching a query criteria.',


  inputs: {

    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      readOnly: true,
      example: '==='
    },

    models: {
      description: 'An object containing all of the model definitions that have been registered.',
      required: true,
      example: '==='
    },

    query: {
      description: 'A valid stage three Waterline query.',
      required: true,
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The results of the destroy query.',
      outputVariableName: 'records',
      example: '==='
    },

    invalidDatastore: {
      description: 'The datastore used is invalid. It is missing key pieces.'
    },

    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }

  },


  fn: function destroy(inputs, exits) {
    // Dependencies
    var _ = require('@sailshq/lodash');
    var WLUtils = require('waterline-utils');
    var Helpers = require('./private');


    // Store the Query input for easier access
    var query = inputs.query;
    query.meta = query.meta || {};

    // Find the model definition
    var model = inputs.models[query.using];
    if (!model) {
      return exits.invalidDatastore();
    }


    // Set a flag to determine if records are being returned
    var fetchRecords = false;


    //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┬┌─┐┬ ┬  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐
    //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤││  ├─┤  └┐┌┘├─┤│  │ │├┤ └─┐
    //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴┴└─┘┴ ┴   └┘ ┴ ┴┴─┘└─┘└─┘└─┘
    //  ┌┬┐┌─┐  ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌
    //   │ │ │  ├┬┘├┤  │ │ │├┬┘│││
    //   ┴ └─┘  ┴└─└─┘ ┴ └─┘┴└─┘└┘
    if (_.has(query.meta, 'fetch') && query.meta.fetch) {
      fetchRecords = true;
    }


    // Find the Primary Key
    var primaryKeyField = model.primaryKey;
    var primaryKeyColumnName = model.definition[primaryKeyField].columnName;


    // Get mongo collection (and spawn a new connection)
    var collection = inputs.datastore.manager.collection(query.using);


    // Normalize the WHERE criteria into a mongo style where clause
    var where;
    try {
      where = Helpers.query.normalizeWhere(query.criteria.where);
    } catch (e) {
      return exits.error(e);
    }

    // First, if fetch is set to true get all the records that match the given
    // criteria. This way they can be returned after the destroy.
    (function findMatchingRecords(proceed) {
      if (!fetchRecords) {
        return proceed();
      }

      // Otherwise find the _id property of the matching records
      collection.find(where).toArray(function findCb(err, report) {
        if (err) {
          return proceed(err);
        }

        return proceed(undefined, report);
      });
    })(function destroyRecords(err, foundRecords) {
      if (err) {
        return exits.error(err);
      }

      // Destroy the documents in the db.
      collection.deleteMany(where, function(err, results) {
        if (err) {
          return exits.error(err);
        }

        if (fetchRecords) {
          // Process each record to normalize output
          try {
            Helpers.query.processEachRecord({
              records: foundRecords,
              identity: model.identity,
              orm: fauxOrm
            });
          } catch (e) {
            return exits.error(e);
          }

          return exits.success({ records: foundRecords });
        }

        return exits.success();
      }); // </ collection.update >
    });
  }
});
