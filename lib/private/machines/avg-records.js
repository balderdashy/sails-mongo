module.exports = require('machine').build({


  friendlyName: 'Avg (records)',


  description: 'Return the Average of the records matched by the query.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    phOrm: require('../constants/ph-orm.input'),
  },


  exits: {

    success: {
      description: 'The average value of the given property across all records.',
      outputFriendlyName: 'Average (mean)',
      outputExample: -48.1293
    },

  },


  fn: function avg(inputs, exits) {
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
          avg: {
            $avg: '$' + query.numericAttrName
          }
        }
      }
    ];

    // Run the aggregation on the collection.
    collection.aggregate(aggregation, function aggregateCb(err, results) {
      if (err) {
        return exits.error(err);
      }

      var mean = _.first(results).avg;
      return exits.success(mean);
    });
  }
});
