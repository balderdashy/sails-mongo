module.exports = {


  friendlyName: 'Destroy (records)',


  description: 'Destroy record(s) in the database matching a query criteria.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    dryOrm: require('../constants/dry-orm.input'),
  },


  exits: {

    success: {
      outputFriendlyName: 'Records (maybe)',
      outputDescription: 'Either `null` OR (if `fetch:true`) an array of physical records that were destroyed.',
      outputExample: '==='
    },

  },


  fn(inputs, exits) {

    // Dependencies
    const _ = require('@sailshq/lodash');
    const processNativeRecord = require('./private/process-native-record');
    const buildMongoWhereClause = require('./private/build-mongo-where-clause');


    // Local var for the stage 3 query, for easier access.
    const s3q = inputs.query;
    if (s3q.meta && s3q.meta.logMongoS3Qs) {
      console.log('* * * * * *\nADAPTER (DESTROY RECORDS):',require('util').inspect(s3q,{depth:5}),'\n');
    }

    // Local var for the `tableName`, for clarity.
    const tableName = s3q.using;

    // Grab the model definition
    const WLModel = _.find(inputs.dryOrm.models, {tableName});
    if (!WLModel) {
      return exits.error(new Error(`No model with that tableName (\`${tableName}\`) has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter's internal state have been corrupted?  (This error is usually due to a bug in this adapter's implementation.)`));
    }// -•

    // Grab the pk column name (for use below)
    let pkColumnName;
    try {
      pkColumnName = WLModel.attributes[WLModel.primaryKey].columnName;
    } catch (e) { return exits.error(e); }


    //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┌─┐┌┬┐┬ ┬┌─┐┬─┐  ┌┬┐┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌─┐┬─┐  ┌┐┌┌─┐┌┬┐
    //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤├┤  │ ├─┤├┤ ├┬┘   │ │ │  ╠╣ ║╣  ║ ║  ╠═╣  │ │├┬┘  ││││ │ │
    //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴└─┘ ┴ ┴ ┴└─┘┴└─   ┴ └─┘  ╚  ╚═╝ ╩ ╚═╝╩ ╩  └─┘┴└─  ┘└┘└─┘ ┴
    let isFetchEnabled;
    if (s3q.meta && s3q.meta.fetch) { isFetchEnabled = true; }
    else { isFetchEnabled = false; }


    //  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┬┌─┐┬ ┬  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦╔═╗
    //  ││││ │││││ ┬│ ││├┤ └┬┘  ║  ╠╦╝║ ║ ║╣ ╠╦╝║╠═╣
    //  ┴ ┴└─┘┘└┘└─┘└─┘┴└   ┴   ╚═╝╩╚═╩ ╩ ╚═╝╩╚═╩╩ ╩
    // Build a Mongo-style WHERE from the `where` clause.
    let mongoWhere;
    try {
      mongoWhere = buildMongoWhereClause(s3q.criteria.where, WLModel, s3q.meta);
    } catch (e) { return exits.error(e); }


    //  ╔═╗╔═╗╔╦╗╔╦╗╦ ╦╔╗╔╦╔═╗╔═╗╔╦╗╔═╗  ┬ ┬┬┌┬┐┬ ┬  ┌┬┐┌┐
    //  ║  ║ ║║║║║║║║ ║║║║║║  ╠═╣ ║ ║╣   ││││ │ ├─┤   ││├┴┐
    //  ╚═╝╚═╝╩ ╩╩ ╩╚═╝╝╚╝╩╚═╝╩ ╩ ╩ ╚═╝  └┴┘┴ ┴ ┴ ┴  ─┴┘└─┘
    const db = inputs.connection;
    const mongoCollection = db.collection(tableName);

    // First, if fetch is set to true get all the records that match the given
    // criteria. This way they can be returned after the destroy.
    (function findMatchingRecords(proceed) {
      if (!isFetchEnabled) {
        return proceed();
      }

      // Find matching records.
      mongoCollection.find(mongoWhere).toArray((err, nativeResult) => {
        if (err) { return proceed(err); }
        return proceed(undefined, nativeResult);
      });

    })((err, phRecords) => {
      if (err) { return exits.error(err); }

      // Destroy the documents in the db.
      let secondaryMongoWhere;
      if (!isFetchEnabled) {
        secondaryMongoWhere = mongoWhere;
      }
      else {
        secondaryMongoWhere = {};
        secondaryMongoWhere[pkColumnName] = { '$in': _.pluck(phRecords, pkColumnName) };
      }
      mongoCollection.deleteMany(secondaryMongoWhere, (err) => {
        if (err) { return exits.error(err); }

        if (!isFetchEnabled) {
          return exits.success();
        }// -•

        //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┌─┐─┐
        //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │││├─┤ │ │└┐┌┘├┤   ├┬┘├┤ │  │ │├┬┘ │││ └─┐ │
        //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  ┴└─└─┘└─┘└─┘┴└──┴┘└─└─┘─┘
        // Process records (mutate in-place) to wash away adapter-specific eccentricities.
        try {
          _.each(phRecords, (phRecord) => {
            processNativeRecord(phRecord, WLModel, s3q.meta);
          });
        } catch (e) { return exits.error(e); }

        return exits.success(phRecords);

      }); // </ mongoCollection.deleteMany >
    });// </ self-calling function :: findMatchingRecords >

  }
};
