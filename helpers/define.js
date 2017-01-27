//  ██████╗ ███████╗███████╗██╗███╗   ██╗███████╗
//  ██╔══██╗██╔════╝██╔════╝██║████╗  ██║██╔════╝
//  ██║  ██║█████╗  █████╗  ██║██╔██╗ ██║█████╗
//  ██║  ██║██╔══╝  ██╔══╝  ██║██║╚██╗██║██╔══╝
//  ██████╔╝███████╗██║     ██║██║ ╚████║███████╗
//  ╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝
//

var _ = require('@sailshq/lodash');
var async = require('async');

module.exports = require('machine').build({


  friendlyName: 'Define',


  description: 'Create a new table in the database based on a given schema.',


  inputs: {

    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      example: '==='
    },

    collectionName: {
      description: 'The name of the collectionName to describe.',
      required: true,
      example: 'users'
    },

    definition: {
      description: 'The definition of the schema to build.',
      required: true,
      example: {}
    },

    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Additional stuff to pass to the driver.',
      extendedDescription: 'This is reserved for custom driver-specific extensions.',
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The table was created successfully.'
    },

    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }

  },


  fn: function define(inputs, exits) {

    // Get mongo collection (and spawn a new connection)
    var collection = inputs.datastore.manager.collection(inputs.collectionName);

    // Build an array of any UNIQUE indexes needed
    var uniqueIndexes = [];

    // Go through each item in the definition and create a
    _.each(inputs.definition, function findUniqueKeys(val, key) {
      if (_.has(val, 'unique') && val.unique) {
        uniqueIndexes.push(key);
      }
    });

    // Ignore unique indexes on any _id keys
    _.remove(uniqueIndexes, function cleanIndexList(val) {
      return val === '_id';
    });

    // If there are no indexes to create bail out
    if (!uniqueIndexes.length) {
      return exits.success();
    }


    // Otherwise go through and create each one by one.
    async.each(uniqueIndexes, function createUniqueIndex(key, nextKey) {
      // Build up an index dictionary
      var idx = {};
      idx[key] = 1;

      // Create the index on the collection
      collection.createIndex(idx, { unique: true }, nextKey);
    }, function idxCb(err) {
      if (err) {
        return exits.error(err);
      }

      return exits.success();
    });
  }
});
