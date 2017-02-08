//  ███████╗███████╗██╗     ███████╗ ██████╗████████╗     █████╗  ██████╗████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔════╝██╔════╝██║     ██╔════╝██╔════╝╚══██╔══╝    ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ███████╗█████╗  ██║     █████╗  ██║        ██║       ███████║██║        ██║   ██║██║   ██║██╔██╗ ██║
//  ╚════██║██╔══╝  ██║     ██╔══╝  ██║        ██║       ██╔══██║██║        ██║   ██║██║   ██║██║╚██╗██║
//  ███████║███████╗███████╗███████╗╚██████╗   ██║       ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
//  ╚══════╝╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝       ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//

module.exports = require('machine').build({


  friendlyName: 'Select',


  description: 'Find record(s) in the database.',


  inputs: {

    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      readOnly: true,
      example: '==='
    },

    models: {
      description: 'An object containing all of the model definitions that have been registered.',
      required: true,
      example: '==='
    },

    query: {
      description: 'A valid stage three Waterline query.',
      required: true,
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The results of the select query.',
      outputVariableName: 'records',
      example: '==='
    },

    invalidDatastore: {
      description: 'The datastore used is invalid. It is missing key pieces.'
    },

    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }

  },


  fn: function select(inputs, exits) {
    // Dependencies
    var _ = require('@sailshq/lodash');
    var Helpers = require('./private');


    // Store the Query input for easier access
    var query = inputs.query;
    query.meta = query.meta || {};


    // Find the model definition
    var model = inputs.models[query.using];
    if (!model) {
      return exits.invalidDatastore();
    }


    // Get mongo collection (and spawn a new connection)
    var collection = inputs.datastore.manager.collection(query.using);


    // Normalize the WHERE criteria into a mongo style where clause
    var where;
    try {
      where = Helpers.query.normalizeWhere(query.criteria.where);
    } catch (e) {
      return exits.error(e);
    }

    // Transform the stage-3 query sort array into a Mongo sort dictionary.
    var sort = _.map(query.criteria.sort, function mapSort(sortObj) {
      var key = _.first(_.keys(sortObj));
      var sortCriteria = [];
      var sortDirection = sortObj[key].toLowerCase() === 'asc' ? 1 : -1;
      sortCriteria.push(key);
      sortCriteria.push(sortDirection);
      return sortCriteria;
    });

    // Transform the stage-3 query select array into a Mongo projection dictionary.
    var projection = _.reduce(query.criteria.select, function reduceProjection(memo, colName) {
      memo[colName] = 1;
      return memo;
    }, {});

    // Create the initial adapter query.
    var findQuery = collection.find(where, projection).sort(sort);

    // Add in limit if necessary.
    if (query.criteria.limit) {
      findQuery.limit(query.criteria.limit);
    }

    // Add in skip if necessary.
    if (query.criteria.skip) {
      findQuery.skip(query.criteria.skip);
    }

    // Find the documents in the db.
    findQuery.toArray(function findCb(err, records) {
      if (err) {
        return exits.error(err);
      }

      var selectRecords = records;
      var orm = {
        collections: inputs.models
      };

      // Process each record to normalize output
      try {
        Helpers.query.processEachRecord({
          records: selectRecords,
          identity: model.identity,
          orm: orm
        });
      } catch (e) {
        return exits.error(e);
      }

      return exits.success({ records: selectRecords });
    }); // </ findQuery >
  }
});
