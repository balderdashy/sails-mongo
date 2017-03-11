module.exports = require('machine').build({


  friendlyName: 'Create',


  description: 'Create a new physical record in the database.',


  inputs: {

    query: {
      description: 'A stage three Waterline query.',
      required: true,
      example: '==='//e.g. `{ method: 'create', using: 'the_table_name', ... }`
    },

    models: {
      description: 'A dictionary containing all known model definitions, keyed by model identity.',
      required: true,
      example: '==='//e.g. `{ pet: {attributes:{...}, tableName: 'sack_of_pets'} }`
    },

    connection: {
      description: 'The active database connection to use.',
      extendedDescription: 'This connection _will not be released automatically_ or mutated in any other way by this machine.',
      whereToGet: { description: 'Use getConnection().' },
      readOnly: true,
      example: '===',
    },

    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Spare input reserved for custom, adapter-specific extensions.',
      readOnly: true,
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The record was successfully created.',
      outputFriendlyName: 'Report',
      outputDescription: 'The `record` property is either `null` or (if `fetch:true`) a dictionary representing the new record.  The `meta` property is reserved for internal use.',
      outputExample: '==='// {record: '===', meta: '==='}
    },

    notUnique: {
      outputFriendlyName: 'Uniqueness error',
      outputDescription: 'A native error from the database, with an extra key (`footprint`) attached.',
      outputExample: '==='
    }

  },


  fn: function (inputs, exits) {
    // Dependencies
    var util = require('util');
    var _ = require('@sailshq/lodash');
    var processNativeRecord = require('./private/process-native-record');
    var processNativeError = require('./private/process-native-error');
    var reifyValuesToSet = require('./private/reify-values-to-set');

    // Local var for the stage 3 query, for easier access.
    var s3q = inputs.query;

    // Local var for the `tableName`, for clarity.
    var tableName = s3q.using;

    // Grab the model definition
    var WLModel = _.find(inputs.models, {tableName: tableName});
    if (!WLModel) {
      return exits.error(new Error('No model with that tableName (`'+tableName+'`) has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter\'s internal state have been corrupted?  (This error is usually due to a bug in this adapter\'s implementation.)'));
    }//-•


    //  ╦═╗╔═╗╦╔═╗╦ ╦  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐  ┌┬┐┌─┐  ┌─┐┌─┐┌┬┐
    //  ╠╦╝║╣ ║╠╣ ╚╦╝  └┐┌┘├─┤│  │ │├┤ └─┐   │ │ │  └─┐├┤  │
    //  ╩╚═╚═╝╩╚   ╩    └┘ ┴ ┴┴─┘└─┘└─┘└─┘   ┴ └─┘  └─┘└─┘ ┴
    try {
      reifyValuesToSet(s3q.newRecord, WLModel);
    } catch (e) { return exits.error(e); }


    //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┌─┐┌┬┐┬ ┬┌─┐┬─┐  ┌┬┐┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌─┐┬─┐  ┌┐┌┌─┐┌┬┐
    //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤├┤  │ ├─┤├┤ ├┬┘   │ │ │  ╠╣ ║╣  ║ ║  ╠═╣  │ │├┬┘  ││││ │ │
    //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴└─┘ ┴ ┴ ┴└─┘┴└─   ┴ └─┘  ╚  ╚═╝ ╩ ╚═╝╩ ╩  └─┘┴└─  ┘└┘└─┘ ┴
    var isFetchEnabled;
    if (s3q.meta && s3q.meta.fetch) { isFetchEnabled = true; }
    else { isFetchEnabled = false; }

    //  ╦╔╗╔╔═╗╔═╗╦═╗╔╦╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐
    //  ║║║║╚═╗║╣ ╠╦╝ ║   ├┬┘├┤ │  │ │├┬┘ ││
    //  ╩╝╚╝╚═╝╚═╝╩╚═ ╩   ┴└─└─┘└─┘└─┘┴└──┴┘
    // Create this new record in the database by inserting a document in the appropriate Mongo collection.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Carry through the `fetch: false` optimization all the way to Mongo here,
    // if possible (e.g. using Mongo's projections API)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    var db = inputs.connection;
    var mongoCollection = db.collection(tableName);
    mongoCollection.insertOne(s3q.newRecord, function (err, nativeResult) {
      if (err) {
        err = processNativeError(err);
        if (err.footprint && err.footprint.identity === 'notUnique') {
          return exits.notUnique(err);
        }
        return exits.error(err);
      }//-•


      // If `fetch` is NOT enabled, we're done.
      if (!isFetchEnabled) {
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // FUTURE: Provide access to `insertId` somehow, even if `fetch` is not enabled:
        // ```
        // var insertId = nativeResult.insertedId;
        // ```
        // (Changes would need to happen in driver spec first---see:
        //   https://github.com/node-machine/driver-interface)
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        return exits.success({
          record: undefined
        });
      }//-•


      // Otherwise, IWMIH we'll be fetching records:
      // ============================================

      // Verify that there is only one record.
      if (nativeResult.ops.length !== 1) {
        return exits.error(new Error('Consistency violation: Unexpected # of records returned from Mongo (in `.ops`).  Native result:\n```\n'+util.inspect(nativeResult, {depth: 5})+'\n```'));
      }

      //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐
      //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │││├─┤ │ │└┐┌┘├┤   ├┬┘├┤ │  │ │├┬┘ ││
      //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  ┴└─└─┘└─┘└─┘┴└──┴┘
      // Process record (mutate in-place) to wash away any adapter-specific eccentricities.
      var phRecord = nativeResult.ops[0];
      try {
        processNativeRecord(phRecord, WLModel);
      } catch (e) { return exits.error(e); }

      // Then send it back.
      return exits.success({
        record: phRecord
      });

    }); // </ mongoCollection.insertOne() >
  }
});
