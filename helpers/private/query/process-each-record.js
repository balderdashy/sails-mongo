//  ██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗    ███████╗ █████╗  ██████╗██╗  ██╗
//  ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝    ██╔════╝██╔══██╗██╔════╝██║  ██║
//  ██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗    █████╗  ███████║██║     ███████║
//  ██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║    ██╔══╝  ██╔══██║██║     ██╔══██║
//  ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║    ███████╗██║  ██║╚██████╗██║  ██║
//  ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝    ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
//
//  ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗
//  ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
//  ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║
//  ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║
//  ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝
//  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
//

var _ = require('@sailshq/lodash');
var ObjectID = require('machinepack-mongo').mongodb.ObjectID;
var eachRecordDeep = require('waterline-utils').eachRecordDeep;

module.exports = function processEachRecord(options) {
  //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │ │├─┘ │ ││ ││││└─┐
  //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘┴   ┴ ┴└─┘┘└┘└─┘
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    throw new Error('Invalid options argument. Options must contain: records, identity, and orm.');
  }

  if (!_.has(options, 'records') || !_.isArray(options.records)) {
    throw new Error('Invalid option used in options argument. Missing or invalid records.');
  }

  if (!_.has(options, 'identity') || !_.isString(options.identity)) {
    throw new Error('Invalid option used in options argument. Missing or invalid identity.');
  }

  if (!_.has(options, 'orm') || !_.isPlainObject(options.orm)) {
    throw new Error('Invalid option used in options argument. Missing or invalid orm.');
  }


  // Run all the records through the iterator so that they can be normalized.
  eachRecordDeep(options.records, function iterator(record, WLModel, depth) {

    // Check for a depth other than 1.
    // > Rarely, this might occur if existing data in Mongo happened to be a dictionary or array for
    // > a key that happens to be an association attribute.  But if this is happening, we definitely
    // > don't want to try and process it.
    if (depth !== 1) {
      return;
    }

    // TODO: share this logic w/ preProcessRecord, where possible
    if (_.has(record, '_id')) {

      // This might already be an objectID instance (TODO: check for that and use if possible.  If we're having to instantiate, then log a warning, because it means that a non-object ID was stored at some point.)
      record._id = new ObjectID(record._id).toString();
    }
    // TODO: if the record does not have `_id`, then log a warning and add its index in the array
    // to a list of records that will be excluded from the results below.

    // Also transform any foreign key values to strings
    _.each(WLModel.definition, function findForeignKeys(def) {
      if (_.has(def, 'foreignKey') && def.foreignKey) {
        var attrName = def.columnName;
        if (_.has(record, attrName) && !_.isUndefined(record[attrName])) {
          try {
            var objectified = new ObjectID(record[attrName]);

            // If the objectified is equal to the value then it's a mongo id. This works
            // because when a valid ObjectID is created it's preserved.
            if (objectified.toString() === record[attrName].toString()) {
              record[attrName] = objectified.toString();
            }
          } catch (e) {
            return;
          }
        }
      }
    });

  }, true, options.identity, options.orm);

};
