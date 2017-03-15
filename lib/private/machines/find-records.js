module.exports = require('machine').build({


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


  fn: function select(inputs, exits) {
    // Dependencies
    var assert = require('assert');
    var _ = require('@sailshq/lodash');
    var Helpers = require('./private');


    // Store the Query input for easier access
    var query = inputs.query;


    // Find the model definition
    var model = inputs.models[query.using];
    if (!model) {
      return exits.error(new Error('No `'+query.using+'` model has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter\'s internal state have been corrupted?  (This error is usually due to a bug in this adapter\'s implementation.)'));
    }//-•


    // Get mongo collection (and spawn a new connection)
    var mongoCollection = inputs.datastore.manager.collection(query.using);


    // Normalize the WHERE criteria into a mongo style where clause
    var where;
    try {
      where = Helpers.query.normalizeWhere(query.criteria.where);
    } catch (e) { return exits.error(e); }

    // Transform the `sort` clause from a stage 3 query into a Mongo sort.
    var sort = _.map(query.criteria.sort, function mapSort(s3qSortDirective) {

      var mongoSortDirective = [];

      var sortByKey = _.first(_.keys(s3qSortDirective));
      mongoSortDirective.push(sortByKey);

      var sortDirection = s3qSortDirective[sortByKey];
      assert(sortDirection === 'ASC' || sortDirection === 'DESC', new Error('Consistency violation: At this point, the sort direction should always be ASC or DESC (capitalized).  If you are seeing this message, there is probably a bug somewhere in your version of Waterline core.'));
      mongoSortDirective.push(sortDirection === 'ASC' ? 1 : -1);

      return mongoSortDirective;

    });


    // Create the initial Mongo query.
    var mongoDeferred;
    try {
      mongoDeferred = mongoCollection.find(where).limit(query.criteria.limit).sort(sort);
    } catch (err) { return exits.error(err); }


    // Add in `select` if necessary.
    // (note that `select` _could_ be undefined--i.e. when a model is `schema: false`)
    if (query.criteria.select) {

      // Transform the stage-3 query select array into a Mongo projection dictionary.
      var projection = _.reduce(query.criteria.select, function reduceProjection(memo, colName) {
        memo[colName] = 1;
        return memo;
      }, {});
      mongoDeferred = mongoDeferred.project(projection);
    }

    // Add in skip if necessary.
    // (if it is zero, no reason to mess with mixing it in)
    if (query.criteria.skip) {
      mongoDeferred.skip(query.criteria.skip);
    }

    // Find the documents in the db.
    mongoDeferred.toArray(function findCb(err, records) {
      if (err) { return exits.error(err); }

      // Process each record to normalize output
      try {
        Helpers.query.processEachRecord({
          records: records,
          identity: model.identity,
          orm: { collections: inputs.models }
        });
      } catch (e) { return exits.error(e); }

      return exits.success(records);

    }); // </ mongoDeferred.toArray() >
  }
});
