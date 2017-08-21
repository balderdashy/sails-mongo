module.exports = {


  friendlyName: 'Sum (records)',


  description: 'Return the cumulative sum (∑) of a particular property over matching records.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    dryOrm: require('../constants/dry-orm.input'),
  },


  exits: {

    success: {
      outputFriendlyName: 'Total (sum)',
      outputDescription: 'The sum of the given property across all matching records.',
      outputExample: 999.99
    },

  },


  fn: function sum(inputs, exits) {

    // Dependencies
    var _ = require('@sailshq/lodash');
    var buildMongoWhereClause = require('./private/build-mongo-where-clause');

    // Local var for the stage 3 query, for easier access.
    var s3q = inputs.query;

    // Local var for the `tableName`, for clarity.
    var tableName = s3q.using;

    // Local var for the name of the numeric field, for clarity.
    //
    // > Remember: Contrary to what you might think given its naming,
    // > by the time it gets to the adapter (in an s3q), the `numericAttrName`
    // > qk has already been normalized to be a column name, not an attribute name.
    var numericFieldName = s3q.numericAttrName;

    // Grab the model definition
    var WLModel = _.find(inputs.dryOrm.models, {tableName: tableName});
    if (!WLModel) {
      return exits.error(new Error('No model with that tableName (`'+tableName+'`) has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter\'s internal state have been corrupted?  (This error is usually due to a bug in this adapter\'s implementation.)'));
    }//-•

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
    mongoCollection.aggregate([
      { $match: mongoWhere },
      {
        $group: {
          _id: numericFieldName,
          sum: {
            $sum: '$'+numericFieldName
          }
        }
      }
    ], function aggregateCb(err, nativeResult) {
      if (err) { return exits.error(err); }

      var sum = 0;
      if (_.first(nativeResult)) { sum = _.first(nativeResult).sum; }
      return exits.success(sum);
    });//</ db.collection(...).aggregate() >
  }

};
