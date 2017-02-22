//   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗     █████╗  ██████╗████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝    ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗      ███████║██║        ██║   ██║██║   ██║██╔██╗ ██║
//  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝      ██╔══██║██║        ██║   ██║██║   ██║██║╚██╗██║
//  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗    ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
//   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝    ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//

module.exports = require('machine').build({


  friendlyName: 'Create',


  description: 'Create a new physical record in the database.',


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
      description: 'The record was successfully inserted.',
      outputFriendlyName: 'Report',
      outputDescription: 'The `record` property is either `null` or (if `fetch:true`) a dictionary representing the new record.  The `meta` property is reserved for internal use.',
      example: '==='// {record: '===', meta: '==='}
    },

    notUnique: {
      outputFriendlyName: 'Uniqueness error',
      outputDescription: 'A native error from the database, with an extra key (`footprint`) attached.',
      outputExample: '==='
    }

  },


  fn: function create(inputs, exits) {
    // Dependencies
    var util = require('util');
    var _ = require('@sailshq/lodash');
    var processNativeRecord = require('./private/process-native-record');
    var processNativeError = require('./private/process-native-error');
    var reifyValuesToSet = require('./private/reify-values-to-set');

    // Local var for the stage 3 query, for easier access.
    var query = inputs.query;

    // Find the model definition
    var model = inputs.models[query.using];
    if (!model) {
      return exits.error(new Error('No `'+query.using+'` model has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter\'s internal state have been corrupted?  (This error is usually due to a bug in this adapter\'s implementation.)'));
    }//-•

    // Set a flag to determine if records will be fetched and returned.
    var isFetchEnabled = false;

    //  ╔═╗╦═╗╔═╗  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐
    //  ╠═╝╠╦╝║╣───╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  ├┬┘├┤ │  │ │├┬┘ ││
    //  ╩  ╩╚═╚═╝  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  ┴└─└─┘└─┘└─┘┴└──┴┘
    try {
      reifyValuesToSet({
        records: [query.newRecord],
        identity: model.identity,
        orm: fauxOrm
      });
    } catch (e) { return exits.error(e); }


    //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┬┌─┐┬ ┬  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐
    //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤││  ├─┤  └┐┌┘├─┤│  │ │├┤ └─┐
    //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴┴└─┘┴ ┴   └┘ ┴ ┴┴─┘└─┘└─┘└─┘
    //  ┌┬┐┌─┐  ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌
    //   │ │ │  ├┬┘├┤  │ │ │├┬┘│││
    //   ┴ └─┘  ┴└─└─┘ ┴ └─┘┴└─┘└┘
    if (_.has(query.meta, 'fetch') && query.meta.fetch) {
      isFetchEnabled = true;
    }

    // Get mongo collection (and spawn a new connection)
    var mongoCollection = inputs.datastore.manager.collection(query.using);



    //  ╦╔╗╔╔═╗╔═╗╦═╗╔╦╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐
    //  ║║║║╚═╗║╣ ╠╦╝ ║   ├┬┘├┤ │  │ │├┬┘ ││
    //  ╩╝╚╝╚═╝╚═╝╩╚═ ╩   ┴└─└─┘└─┘└─┘┴└──┴┘
    // Create this new record in the database by inserting a document in the appropriate Mongo collection.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Carry through the `fetch: false` optimization all the way to Mongo here,
    // if possible (e.g. using Mongo's projections API)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    mongoCollection.insertOne(query.newRecord, function (err, nativeResult) {
      if (err) {
        err = processNativeError(err);
        if (err.footprint && err.footprint.identity === 'notUnique') {
          return exits.notUnique(err);
        }
        return exits.error(err);
      }//-•


      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: Provide access to `insertId` somehow, even if `fetch` is not enabled:
      // ```
      // var insertId = nativeResult.insertedId;
      // ```
      // (Changes would need to happen in driver spec first---see:
      //   https://github.com/node-machine/driver-interface)
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

      // If `fetch` is not enabled, we're done.
      if (!isFetchEnabled) {
        return exits.success();
      }//-•

      // Otherwise, IWMIH we'll be fetching records.

      // Verify that there is only one record.
      if (nativeResult.ops.length !== 1) {
        return exits.error(new Error('Consistency violation: Unexpected # of records returned from Mongo (in `.ops`).  Native result:\n```\n'+util.inspect(nativeResult, {depth: 5})+'\n```'));
      }

      // Process record (mutate in-place) to wash away any adapter-specific eccentricities.
      var phRecord = nativeResult.ops[0];
      try {
        processNativeRecord({
          records: phRecord,
          identity: model.identity,
          orm: { collections: inputs.models }
        });
      } catch (e) { return exits.error(e); }

      // Then send it back.
      return exits.success({
        record: phRecord
      });

    }); // </ mongoCollection.insertOne(); >
  }
});
