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
    var Helpers = require('./private');


    // Store the Query input for easier access
    var query = inputs.query;

    // Find the model definition
    var model = inputs.models[query.using];
    if (!model) {
      return exits.error(new Error('No `'+query.using+'` model has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter\'s internal state have been corrupted?  (This error is usually due to a bug in this adapter\'s implementation.)'));
    }//-•


    // Get mongo collection (and spawn a new connection)
    var collection = inputs.datastore.manager.collection(query.using);

    // Normalize the WHERE criteria into a mongo style where clause
    var where;
    try {
      where = Helpers.query.normalizeWhere(query.criteria.where);
    } catch (e) {
      return exits.error(e);
    }


    //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌─┐┌─┐┬─┐┌─┐┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ╠╩╗║ ║║║   ║║  ├─┤│ ┬│ ┬├┬┘├┤ │ ┬├─┤ │ ││ ││││
    //  ╚═╝╚═╝╩╩═╝═╩╝  ┴ ┴└─┘└─┘┴└─└─┘└─┘┴ ┴ ┴ ┴└─┘┘└┘
    var aggregation = [
      { $match: where },
      {
        $group: {
          _id: query.numericAttrName,
          sum: {
            $sum: '$' + query.numericAttrName
          }
        }
      }
    ];

    // Run the aggregation on the collection.
    collection.aggregate(aggregation, function aggregateCb(err, results) {
      if (err) {
        return exits.error(err);
      }

      var sum = _.first(results).sum;
      return exits.success(sum);
    });
  }
};
