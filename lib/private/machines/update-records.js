module.exports = {


  friendlyName: 'Update (records)',


  description: 'Update record(s) in the database based on a query criteria.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    dryOrm: require('../constants/dry-orm.input'),
  },


  exits: {

    success: {
      outputFriendlyName: 'Records (maybe)',
      outputDescription: 'Either `null` OR (if `fetch:true`) an array of physical records that were updated.',
      outputExample: '==='
    },

    notUnique: require('../constants/not-unique.exit'),

  },


  fn: function (inputs, exits) {

    // Dependencies
    var _ = require('@sailshq/lodash');
    var processNativeRecord = require('./private/process-native-record');
    var processNativeError = require('./private/process-native-error');
    var reifyValuesToSet = require('./private/reify-values-to-set');
    var buildMongoWhereClause = require('./private/build-mongo-where-clause');


    // Local var for the stage 3 query, for easier access.
    var s3q = inputs.query;
    if (s3q.meta && s3q.meta.logMongoS3Qs) {
      console.log('* * * * * *\nADAPTER (UPDATE RECORDS):',require('util').inspect(s3q,{depth:5}),'\n');
      // console.log(typeof s3q.criteria.where._id.in[0]);
    }

    // Local var for the `tableName`, for clarity.
    var tableName = s3q.using;

    // Grab the model definition
    var WLModel = _.find(inputs.dryOrm.models, {tableName: tableName});
    if (!WLModel) {
      return exits.error(new Error('No model with that tableName (`'+tableName+'`) has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter\'s internal state have been corrupted?  (This error is usually due to a bug in this adapter\'s implementation.)'));
    }//-•

    // Grab the pk column name (for use below)
    var pkColumnName;
    try {
      pkColumnName = WLModel.attributes[WLModel.primaryKey].columnName;
    } catch (e) { return exits.error(e); }


    //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┌─┐┌┬┐┬ ┬┌─┐┬─┐  ┌┬┐┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌─┐┬─┐  ┌┐┌┌─┐┌┬┐
    //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤├┤  │ ├─┤├┤ ├┬┘   │ │ │  ╠╣ ║╣  ║ ║  ╠═╣  │ │├┬┘  ││││ │ │
    //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴└─┘ ┴ ┴ ┴└─┘┴└─   ┴ └─┘  ╚  ╚═╝ ╩ ╚═╝╩ ╩  └─┘┴└─  ┘└┘└─┘ ┴
    var isFetchEnabled;
    if (s3q.meta && s3q.meta.fetch) { isFetchEnabled = true; }
    else { isFetchEnabled = false; }

    //  ╦═╗╔═╗╦╔═╗╦ ╦  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐  ┌┬┐┌─┐  ┌─┐┌─┐┌┬┐
    //  ╠╦╝║╣ ║╠╣ ╚╦╝  └┐┌┘├─┤│  │ │├┤ └─┐   │ │ │  └─┐├┤  │
    //  ╩╚═╚═╝╩╚   ╩    └┘ ┴ ┴┴─┘└─┘└─┘└─┘   ┴ └─┘  └─┘└─┘ ┴
    try {
      reifyValuesToSet(s3q.valuesToSet, WLModel, s3q.meta);
    } catch (e) { return exits.error(e); }


    //  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┬┌─┐┬ ┬  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦╔═╗
    //  ││││ │││││ ┬│ ││├┤ └┬┘  ║  ╠╦╝║ ║ ║╣ ╠╦╝║╠═╣
    //  ┴ ┴└─┘┘└┘└─┘└─┘┴└   ┴   ╚═╝╩╚═╩ ╩ ╚═╝╩╚═╩╩ ╩
    // Build a Mongo-style WHERE from the `where` clause.
    var mongoWhere;
    try {
      mongoWhere = buildMongoWhereClause(s3q.criteria.where, WLModel, s3q.meta);
    } catch (e) { return exits.error(e); }


    //  ╔═╗╔═╗╔╦╗╔╦╗╦ ╦╔╗╔╦╔═╗╔═╗╔╦╗╔═╗  ┬ ┬┬┌┬┐┬ ┬  ┌┬┐┌┐
    //  ║  ║ ║║║║║║║║ ║║║║║║  ╠═╣ ║ ║╣   ││││ │ ├─┤   ││├┴┐
    //  ╚═╝╚═╝╩ ╩╩ ╩╚═╝╝╚╝╩╚═╝╩ ╩ ╩ ╚═╝  └┴┘┴ ┴ ┴ ┴  ─┴┘└─┘
    var db = inputs.connection;
    var mongoCollection = db.collection(tableName);

    // First, get the IDs of records which match this criteria (if needed).
    (function findMatchingIdsMaybe(proceed) {
      if (!isFetchEnabled) {
        return proceed();
      }

      var projection = {};
      projection[pkColumnName] = 1;
      // console.log('* * * *');
      // console.log('mongoWhere:',mongoWhere);
      // console.log('typeof mongoWhere._id.$in[0]:',typeof mongoWhere._id.$in[0]);
      // console.log('projection:',projection);
      mongoCollection.find(mongoWhere, projection).toArray(function findCb(err, nativeResult) {
        if (err) { return proceed(err); }
        return proceed(undefined, _.pluck(nativeResult, pkColumnName));
      });

    })(function findMatchingIdsMaybeCb(err, pkValsOfMatchingRecords) {
      if (err) { return exits.error(err); }

      // Update the documents in the db.
      var secondaryMongoWhere;
      if (!isFetchEnabled) {
        secondaryMongoWhere = mongoWhere;
      }
      else {
        secondaryMongoWhere = {};
        secondaryMongoWhere[pkColumnName] = { '$in': pkValsOfMatchingRecords };
      }

      // if (s3q.meta && s3q.meta.logMongoS3Qs) {
      //   console.log('pkValsOfMatchingRecords',pkValsOfMatchingRecords);
      //   console.log('- - - - - - -  - - -UPDATE: secondaryMongoWhere:',secondaryMongoWhere, { '$set': s3q.valuesToSet });
      // }

      mongoCollection.updateMany(secondaryMongoWhere, { '$set': s3q.valuesToSet }, function updateManyCb(err) {
        if (err) {
          err = processNativeError(err);
          if (err.footprint && err.footprint.identity === 'notUnique') {
            return exits.notUnique(err);
          }
          return exits.error(err);
        }//-•

        // If fetch:true was not enabled, we're done!
        if (!isFetchEnabled) {
          return exits.success();
        }//-•


        // Handle case where pk value was changed:
        // > This isn't really relevant for Mongo, but it's still included to
        // > improve the error message and to future-proof this adapter.
        if (!_.isUndefined(s3q.valuesToSet[pkColumnName])) {
          // There should only ever be either zero or one record that were found before.
          if (pkValsOfMatchingRecords.length === 0) { /* do nothing */ }
          else if (pkValsOfMatchingRecords.length === 1) {
            var oldPkValue = pkValsOfMatchingRecords[0];
            _.remove(secondaryMongoWhere[pkColumnName]['$in'], oldPkValue);
            var newPkValue = s3q.valuesToSet[pkColumnName];
            secondaryMongoWhere[pkColumnName]['$in'].push(newPkValue);
          }
          else { return exits.error(new Error('Consistency violation: Updated multiple records to have the same primary key value. (PK values should be unique!)')); }
        }//>-


        // Now re-fetch the now-updated records.
        mongoCollection.find(secondaryMongoWhere).toArray(function (err, phRecords) {
          if (err) { return exits.error(err); }

          //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┌─┐─┐
          //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │││├─┤ │ │└┐┌┘├┤   ├┬┘├┤ │  │ │├┬┘ │││ └─┐ │
          //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  ┴└─└─┘└─┘└─┘┴└──┴┘└─└─┘─┘
          // Process records (mutate in-place) to wash away adapter-specific eccentricities.
          try {
            _.each(phRecords, function (phRecord){
              processNativeRecord(phRecord, WLModel, s3q.meta);
            });
          } catch (e) { return exits.error(e); }

          return exits.success(phRecords);
        });// </ mongoCollection.find() >
      });// </ mongoCollection.updateMany >
    });//</ self-calling function :: findMatchingIdsMaybe >
  }

};
