module.exports = require('machine').build({


  friendlyName: 'Update (records)',


  description: 'Update record(s) in the database based on a query criteria.',


  inputs: {
    query: require('../constants/query.input'),
    connection: require('../constants/connection.input'),
    dryOrm: require('../constants/dry-orm.input'),
  },


  exits: {

    success: {
      outputFriendlyName: 'Records (maybe)',
      outputDescription: 'Either `null` OR (if `fetch:true`) an array of physical records that were updated.',
      outputExample: '==='
    },

    notUnique: require('../constants/not-unique.exit'),

  },


  fn: function update(inputs, exits) {
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


    // Set a flag to determine if records are being returned
    var fetchRecords = false;

    // Build a faux ORM for use in processEachRecords
    var fauxOrm = { collections: inputs.models };


    //  ╔═╗╦═╗╔═╗  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐
    //  ╠═╝╠╦╝║╣───╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  ├┬┘├┤ │  │ │├┬┘ ││└─┐
    //  ╩  ╩╚═╚═╝  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘
    // Process each record to normalize output
    try {
      Helpers.query.preProcessRecord({
        records: [query.valuesToSet],
        identity: model.identity,
        orm: fauxOrm
      });
    } catch (e) {
      return exits.error(e);
    }


    //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┬┌─┐┬ ┬  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐
    //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤││  ├─┤  └┐┌┘├─┤│  │ │├┤ └─┐
    //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴┴└─┘┴ ┴   └┘ ┴ ┴┴─┘└─┘└─┘└─┘
    //  ┌┬┐┌─┐  ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌
    //   │ │ │  ├┬┘├┤  │ │ │├┬┘│││
    //   ┴ └─┘  ┴└─└─┘ ┴ └─┘┴└─┘└┘
    if (_.has(query.meta, 'fetch') && query.meta.fetch) {
      fetchRecords = true;
    }


    // Get mongo collection (and spawn a new connection)
    var mongoCollection = inputs.datastore.manager.collection(query.using);


    // Normalize the WHERE criteria into a mongo style where clause
    var where;
    try {
      where = Helpers.query.normalizeWhere(query.criteria.where);
    } catch (e) {
      return exits.error(e);
    }

    // First, if fetch is set to true get all the records that match the given
    // criteria. This way they can be found again after the update.
    (function findMatchingRecords(proceed) {
      if (!fetchRecords) {
        return proceed();
      }

      // Otherwise find the _id property of the matching records
      mongoCollection.find(where, { _id: 1 }).toArray(function findCb(err, report) {
        if (err) {
          return proceed(err);
        }

        return proceed(undefined, report);
      });
    })(function updateRecords(err, foundRecords) {
      if (err) {
        return exits.error(err);
      }

      // Update the documents in the db.
      mongoCollection.updateMany(where, { '$set': query.valuesToSet }, function updateManyCb(err) {
        if (err) {
          if (err.code === 11000 || err.code === 11001) {
            err.footprint = {
              identity: 'notUnique'
            };

            // If we can infer which attribute this refers to, add a `keys` array to the error.
            // First, see if only one value in the new record matches the value that triggered the uniqueness violation.
            var errKeys = _.filter(_.values(_.first(query.newRecords)), function filterFn(val) {
              return val === err.key;
            });

            if (errKeys.length === 1) {
              // If so, find the key (i.e. column name) that this value was assigned to, add set that in the `keys` array.
              var footprintKey = _.findKey(_.first(query.newRecords), function findFn(val) {
                return val === err.key;
              });

              // Set the footprint keys
              err.footprint.keys = [footprintKey];
            } else {
              err.footprint.keys = [];
            }

            return exits.notUnique(err);
          }

          return exits.error(err);
        }

        if (!fetchRecords) {
          return exits.success();
        }//-•


        // Lookup the records that were updated
        var matchedRecords = _.map(foundRecords, function mapId(record) {
          return record._id;
        });

        // Do a find using the id's found previously
        mongoCollection.find({ _id: { '$in': matchedRecords } }).toArray(function fetchCb(err, foundRecords) {
          if (err) { return exits.error(err); }

          // Process each record to normalize output
          try {
            Helpers.query.processEachRecord({
              records: foundRecords,
              identity: model.identity,
              orm: fauxOrm
            });
          } catch (e) { return exits.error(e); }

          return exits.success(foundRecords);
        });

      }); // </ mongoCollection.update >
    });
  }
});
