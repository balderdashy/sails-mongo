module.exports = require('machine').build({


  friendlyName: 'Count (records)',


  description: 'Return the count of the records matched by the query.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    phOrm: require('../constants/ph-orm.input'),
  },


  exits: {

    success: {
      outputFriendlyName: 'Total (# of records)',
      outputDescription: 'The number of matching records.',
      outputExample: 59
    },

  },


  fn: function count(inputs, exits) {
    // Dependencies
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

    // Do a count using the criteria
    collection.find(where).count(function countCb(err, count) {
      if (err) {
        return exits.error(err);
      }

      return exits.success(count);
    });
  }
});
