module.exports = {


  friendlyName: 'Avg (records)',


  description: 'Return the Average of the records matched by the query.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    dryOrm: require('../constants/dry-orm.input'),
  },


  exits: {

    success: {
      outputFriendlyName: 'Average (mean)',
      outputDescription: 'The average value of the given property across all records.',
      outputExample: -48.1293
    },

  },


  fn(inputs, exits) {

    // Dependencies
    const _ = require('@sailshq/lodash');
    const buildMongoWhereClause = require('./private/build-mongo-where-clause');

    // Local var for the stage 3 query, for easier access.
    const s3q = inputs.query;

    // Local var for the `tableName`, for clarity.
    const tableName = s3q.using;

    // Local var for the name of the numeric field, for clarity.
    //
    // > Remember: Contrary to what you might think given its naming,
    // > by the time it gets to the adapter (in an s3q), the `numericAttrName`
    // > qk has already been normalized to be a column name, not an attribute name.
    const numericFieldName = s3q.numericAttrName;

    // Grab the model definition
    const WLModel = _.find(inputs.dryOrm.models, {tableName});
    if (!WLModel) {
      return exits.error(new Error(`No model with that tableName (\`${tableName}\`) has been registered with this adapter.  Were any unexpected modifications made to the stage 3 query?  Could the adapter's internal state have been corrupted?  (This error is usually due to a bug in this adapter's implementation.)`));
    }// -•

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
    const cursor = mongoCollection.aggregate([
      { $match: mongoWhere },
      {
        $group: {
          _id: numericFieldName,
          avg: {
            $avg: `$${numericFieldName}`
          }
        }
      }
    ], { cursor: {} });

    cursor.toArray((err, nativeResult) => {
      if (err) { return exits.error(err); }

      let mean = 0;
      if (_.first(nativeResult)) { mean = _.first(nativeResult).avg; }
      return exits.success(mean);
    });// </ db.collection(...).aggregate() >
  }

};
