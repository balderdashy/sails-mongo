module.exports = require('machine').build({


  friendlyName: 'Destroy (records)',


  description: 'Destroy record(s) in the database matching a query criteria.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    phOrm: require('../constants/ph-orm.input'),
  },


  exits: {

    success: {
      description: 'The results of the destroy query.',
      outputVariableName: 'records',
      example: '==='
    },

  },


  fn: function destroy(inputs, exits) {
    // Dependencies
    var _ = require('@sailshq/lodash');
    var Helpers = require('./private');


    // Store the Query input for easier access
    var query = inputs.query;
    query.meta = query.meta || {};

    // Find the model definition
    var model = inputs.models[query.using];
    if (!model) {
      return exits.error(new Error('No `'+query.using+'` model has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter\'s internal state have been corrupted?  (This error is usually due to a bug in this adapter\'s implementation.)'));
    }//-•


    // Set a flag to determine if records are being returned
    var fetchRecords = false;


    // Build a faux ORM for use in processEachRecords
    var fauxOrm = {
      collections: inputs.models
    };


    //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┬┌─┐┬ ┬  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐
    //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤││  ├─┤  └┐┌┘├─┤│  │ │├┤ └─┐
    //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴┴└─┘┴ ┴   └┘ ┴ ┴┴─┘└─┘└─┘└─┘
    //  ┌┬┐┌─┐  ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌
    //   │ │ │  ├┬┘├┤  │ │ │├┬┘│││
    //   ┴ └─┘  ┴└─└─┘ ┴ └─┘┴└─┘└┘
    if (_.has(query.meta, 'fetch') && query.meta.fetch) {
      fetchRecords = true;
    }


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
      collection.deleteMany(where, function deleteCb(err) {
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
