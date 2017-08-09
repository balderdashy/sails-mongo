module.exports = {


  friendlyName: 'Find (records)',


  description: 'Find record(s) in the database.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    dryOrm: require('../constants/dry-orm.input'),
  },


  exits: {

    success: {
      outputFriendlyName: 'Records',
      outputDescription: 'An array of physical records.',
      outputExample: '===' //[ {===} ]
    },

  },


  fn: function (inputs, exits) {
    // Dependencies
    var assert = require('assert');
    var _ = require('@sailshq/lodash');
    var processNativeRecord = require('./private/process-native-record');
    var buildMongoWhereClause = require('./private/build-mongo-where-clause');


    // Local var for the stage 3 query, for easier access.
    var s3q = inputs.query;
    if (s3q.meta && s3q.meta.logMongoS3Qs) {
      console.log('* * * * * *\nADAPTER (FIND RECORDS):',require('util').inspect(s3q,{depth:10}),'\n');
    }

    // Local var for the `tableName`, for clarity.
    var tableName = s3q.using;

    // Grab the model definition
    var WLModel = _.find(inputs.dryOrm.models, {tableName: tableName});
    if (!WLModel) {
      return exits.error(new Error('No model with that tableName (`'+tableName+'`) has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter\'s internal state have been corrupted?  (This error is usually due to a bug in this adapter\'s implementation.)'));
    }//-•


    //  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┬┌─┐┬ ┬  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦╔═╗
    //  ││││ │││││ ┬│ ││├┤ └┬┘  ║  ╠╦╝║ ║ ║╣ ╠╦╝║╠═╣
    //  ┴ ┴└─┘┘└┘└─┘└─┘┴└   ┴   ╚═╝╩╚═╩ ╩ ╚═╝╩╚═╩╩ ╩

    var db = inputs.connection;
    var mongoCollection = db.collection(tableName);

    // Build a Mongo-style WHERE from the `where` clause.
    var mongoWhere;
    try {
      mongoWhere = buildMongoWhereClause(s3q.criteria.where, WLModel, s3q.meta);
    } catch (e) { return exits.error(e); }

    // if (s3q.meta && s3q.meta.logMongoS3Qs) {
    //   console.log('mongoWhere',require('util').inspect(mongoWhere,{depth:10}));
    //   console.log('mongoWhere["$and"] && typeof mongoWhere["$and"][0].driver_taxis.in[0]',require('util').inspect(mongoWhere['$and'] && typeof mongoWhere['$and'][0].driver_taxis.$in[0],{depth:10}));
    // }


    // Transform the `sort` clause from a stage 3 query into a Mongo sort.
    var mongoSort = _.map(s3q.criteria.sort, function mapSort(s3qSortDirective) {

      var mongoSortDirective = [];

      var sortByKey = _.first(_.keys(s3qSortDirective));
      mongoSortDirective.push(sortByKey);

      var sortDirection = s3qSortDirective[sortByKey];
      assert(sortDirection === 'ASC' || sortDirection === 'DESC', 'At this point, the sort direction should always be ASC or DESC (capitalized).  If you are seeing this message, there is probably a bug somewhere in your version of Waterline core.');
      mongoSortDirective.push(sortDirection === 'ASC' ? 1 : -1);

      return mongoSortDirective;

    });

    // Create the initial Mongo deferred, taking care of `where`, `limit`, and `sort`.
    var mongoDeferred;
    try {
      assert(_.isNumber(s3q.criteria.limit), 'At this point, the limit should always be a number, but instead it is `'+s3q.criteria.limit+'`.  If you are seeing this message, there is probably a bug somewhere in your version of Waterline core.');
      mongoDeferred = mongoCollection.find(mongoWhere).limit(s3q.criteria.limit);
      if (mongoSort.length) {
        mongoDeferred = mongoDeferred.sort(mongoSort);
      }
    } catch (err) { return exits.error(err); }

    // Add in `select` if necessary.
    // (note that `select` _could_ be undefined--i.e. when a model is `schema: false`)
    if (s3q.criteria.select) {

      // Transform the stage-3 query select array into a Mongo projection dictionary.
      var projection = _.reduce(s3q.criteria.select, function reduceProjection(memo, colName) {
        memo[colName] = 1;
        return memo;
      }, {});
      mongoDeferred = mongoDeferred.project(projection);
    }

    // Add in skip if necessary.
    // (if it is zero, no reason to mess with mixing it in at all)
    if (s3q.criteria.skip) {
      mongoDeferred.skip(s3q.criteria.skip);
    }


    //  ╔═╗╔═╗╔╦╗╔╦╗╦ ╦╔╗╔╦╔═╗╔═╗╔╦╗╔═╗  ┬ ┬┬┌┬┐┬ ┬  ┌┬┐┌┐
    //  ║  ║ ║║║║║║║║ ║║║║║║  ╠═╣ ║ ║╣   ││││ │ ├─┤   ││├┴┐
    //  ╚═╝╚═╝╩ ╩╩ ╩╚═╝╝╚╝╩╚═╝╩ ╩ ╩ ╚═╝  └┴┘┴ ┴ ┴ ┴  ─┴┘└─┘
    // Find the documents in the db.
    mongoDeferred.toArray(function findCb(err, nativeResult) {
      if (err) { return exits.error(err); }

      //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┌─┐─┐
      //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │││├─┤ │ │└┐┌┘├┤   ├┬┘├┤ │  │ │├┬┘ │││ └─┐ │
      //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  ┴└─└─┘└─┘└─┘┴└──┴┘└─└─┘─┘
      // Process records (mutate in-place) to wash away adapter-specific eccentricities.
      var phRecords = nativeResult;
      try {
        _.each(phRecords, function (phRecord){
          processNativeRecord(phRecord, WLModel, s3q.meta);
        });
      } catch (e) { return exits.error(e); }


      // if (s3q.meta && s3q.meta.logMongoS3Qs) {
      //   console.log('found %d records',phRecords.length, require('util').inspect(phRecords,{depth:10}),'\n');
      // }
      return exits.success(phRecords);

    }); // </ mongoDeferred.toArray() >
  }

};
