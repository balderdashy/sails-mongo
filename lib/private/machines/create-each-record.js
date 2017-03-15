module.exports = require('machine').build({


  friendlyName: 'Create each (record)',


  description: 'Insert multiple records into a collection in the database.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    dryOrm: require('../constants/dry-orm.input'),
  },


  exits: {

    success: {
      outputFriendlyName: 'Records (maybe)',
      outputDescription: 'Either `null` or (if `fetch:true`) an array of new physical records that were created.',
      outputExample: '==='
    },

    notUnique: require('../constants/not-unique.exit'),

  },


  fn: function (inputs, exits) {
    // Dependencies
    var _ = require('@sailshq/lodash');
    var Helpers = require('./private');

    // Store the Query input for easier access
    var query = inputs.query;


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

    // Check for empty array which will error out.
    if (query.newRecords.length === 0) {
      return exits.success();
    }


    //  ╔═╗╦═╗╔═╗  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐
    //  ╠═╝╠╦╝║╣───╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  ├┬┘├┤ │  │ │├┬┘ ││└─┐
    //  ╩  ╩╚═╚═╝  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘
    // Process each record to normalize output
    try {
      Helpers.query.preProcessRecord({
        records: query.newRecords,
        identity: model.identity,
        orm: fauxOrm
      });
    } catch (e) {
      return exits.error(e);
    }


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


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌─┐┬ ┬
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   ├┤ ├─┤│  ├─┤
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  └─┘┴ ┴└─┘┴ ┴
    // Run the Create Each util
    Helpers.query.createEach({
      collection: collection,
      query: query
    }, function createEachCb(err, insertedRecords) {
      // If there was an error return it.
      if (err) {
        if (err.footprint && err.footprint.identity === 'notUnique') {
          return exits.notUnique(err);
        }

        return exits.error(err);
      }

      if (fetchRecords) {
        // Process each record to normalize output
        try {
          Helpers.query.processEachRecord({
            records: insertedRecords,
            identity: model.identity,
            orm: fauxOrm
          });
        } catch (e) {
          return exits.error(e);
        }

        return exits.success(insertedRecords);
      }//-•

      return exits.success();
    }); // </ .insertRecord(); >
  }
});
