module.exports = {


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
    const _ = require('@sailshq/lodash');
    const processNativeRecord = require('./private/process-native-record');
    const processNativeError = require('./private/process-native-error');
    const reifyValuesToSet = require('./private/reify-values-to-set');



    // Local var for the stage 3 query, for easier access.
    const s3q = inputs.query;
    if (s3q.meta && s3q.meta.logMongoS3Qs) {
      console.log('* * * * * *\nADAPTER (CREATE EACH RECORD):',require('util').inspect(s3q,{depth:5}),'\n');
    }

    // Local var for the `tableName`, for clarity.
    var tableName = s3q.using;

    // Grab the model definition
    const WLModel = _.find(inputs.dryOrm.models, {tableName: tableName});
    if (!WLModel) {
      return exits.error(new Error('No model with that tableName (`'+tableName+'`) has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter\'s internal state have been corrupted?  (This error is usually due to a bug in this adapter\'s implementation.)'));
    }//-•


    //  ╦═╗╔═╗╦╔═╗╦ ╦  ┌─┐┌─┐┌─┐┬ ┬  ┌┐┌┌─┐┬ ┬  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐
    //  ╠╦╝║╣ ║╠╣ ╚╦╝  ├┤ ├─┤│  ├─┤  │││├┤ │││  ├┬┘├┤ │  │ │├┬┘ ││
    //  ╩╚═╚═╝╩╚   ╩   └─┘┴ ┴└─┘┴ ┴  ┘└┘└─┘└┴┘  ┴└─└─┘└─┘└─┘┴└──┴┘
    try {
      _.each(s3q.newRecords, function (newRecord){
        reifyValuesToSet(newRecord, WLModel, s3q.meta);
      });
    } catch (e) { return exits.error(e); }


    //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┌─┐┌┬┐┬ ┬┌─┐┬─┐  ┌┬┐┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌─┐┬─┐  ┌┐┌┌─┐┌┬┐
    //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤├┤  │ ├─┤├┤ ├┬┘   │ │ │  ╠╣ ║╣  ║ ║  ╠═╣  │ │├┬┘  ││││ │ │
    //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴└─┘ ┴ ┴ ┴└─┘┴└─   ┴ └─┘  ╚  ╚═╝ ╩ ╚═╝╩ ╩  └─┘┴└─  ┘└┘└─┘ ┴
    let isFetchEnabled;
    if (s3q.meta && s3q.meta.fetch) { isFetchEnabled = true; }
    else { isFetchEnabled = false; }

    //  ╔═╗╔═╗╔╦╗╔╦╗╦ ╦╔╗╔╦╔═╗╔═╗╔╦╗╔═╗  ┬ ┬┬┌┬┐┬ ┬  ┌┬┐┌┐
    //  ║  ║ ║║║║║║║║ ║║║║║║  ╠═╣ ║ ║╣   ││││ │ ├─┤   ││├┴┐
    //  ╚═╝╚═╝╩ ╩╩ ╩╚═╝╝╚╝╩╚═╝╩ ╩ ╩ ╚═╝  └┴┘┴ ┴ ┴ ┴  ─┴┘└─┘
    // Create these new records in the database by inserting documents in the appropriate Mongo collection.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Carry through the `fetch: false` optimization all the way to Mongo here,
    // if possible (e.g. using Mongo's projections API)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    const db = inputs.connection;
    const mongoCollection = db.collection(tableName);
    // if (s3q.meta && s3q.meta.logMongoS3Qs) {
    //   console.log('- - - - - - -  - - -CREATE EACH: s3q.newRecords:',require('util').inspect(s3q.newRecords,{depth:5}),'\n');
    // }
    mongoCollection.insertMany(s3q.newRecords).then(async function (nativeResult) {
      // If `fetch` is NOT enabled, we're done.
      if (!isFetchEnabled) {
        return exits.success();
      }//-•

      const insertedIds = Object.values(nativeResult.insertedIds);

      // Otherwise, IWMIH we'll be sending back records:
      // ============================================

      //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┌─┐─┐
      //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │││├─┤ │ │└┐┌┘├┤   ├┬┘├┤ │  │ │├┬┘ │││ └─┐ │
      //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  ┴└─└─┘└─┘└─┘┴└──┴┘└─└─┘─┘
      // Process record(s) (mutate in-place) to wash away adapter-specific eccentricities.
      const phRecords = await mongoCollection.find({ _id: { $in: insertedIds } }).toArray();
      try {
        _.each(phRecords, function (phRecord){
          processNativeRecord(phRecord, WLModel, s3q.meta);
        });
      } catch (e) { return exits.error(e); }

      return exits.success(phRecords);

    }).catch(function(err) {
      err = processNativeError(err);
      if (err.footprint && err.footprint.identity === 'notUnique') {
        return exits.notUnique(err);
      }
      return exits.error(err);
    }); // </ mongoCollection.insertMany() >

  }
};
