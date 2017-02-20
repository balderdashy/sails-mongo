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


  description: 'Define a physical-layer representation in the database based on the given "schema definition".',


  inputs: {

    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      example: '==='
    },

    tableName: {
      description: 'The "tableName" to use.',
      extendedDescription: 'Not necessarily a "table", of course; i.e. a Mongo collection.',
      required: true,
      example: 'users'
    },

    definition: {
      description: 'The "schema definition" to define in the database.',
      required: true,
      example: {}
    },

    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Spare input reserved for custom, adapter-specific extensions.',
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'Successfully defined a physical-layer container based on the given schema definition.',
      outputFriendlyName: 'Meta (maybe)',
      outputExample: '==='
    },

  },


  fn: function define(inputs, exits) {
    // Get mongo collection (and spawn a new connection)
    var mongoCollection = inputs.datastore.manager.collection(inputs.tableName);

    // Build an array of any UNIQUE indexes needed
    var uniqueIndexes = [];

    // Go through each item in the definition to locate fields
    // which demand a uniqueness constraint.
    _.each(inputs.definition, function findUniqueKeys(val, key) {
      if (_.has(val, 'unique') && val.unique) {
        uniqueIndexes.push(key);
      }
    });

    // Ignore unique indexes on any _id keys
    _.remove(uniqueIndexes, function cleanIndexList(val) {
      return val === '_id';
    });

    // If there are no indexes to create, bail out (we're done).
    if (uniqueIndexes.length === 0) {
      return exits.success();
    }//-•


    // Otherwise go through and simultaneously create each one.
    async.each(uniqueIndexes, function createUniqueIndex(key, nextKey) {
      // Build up an index dictionary
      var idx = {};
      idx[key] = 1;

      // Create the index on the Mongo collection
      mongoCollection.createIndex(idx, { unique: true }, nextKey);
    }, function idxCb(err) {
      if (err) {
        return exits.error(err);
      }

      return exits.success();
    });
  }
});
