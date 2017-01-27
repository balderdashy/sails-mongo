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
var ObjectID = require('mongodb').ObjectID;
var utils = require('waterline-utils');
var eachRecordDeep = utils.eachRecordDeep;

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
  eachRecordDeep(options.records, function iterator(record, WLModel) {
    if (_.has(record, '_id')) {
      record._id = new ObjectID(record._id).toString();
    }

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
  }, false, options.identity, options.orm);
};
