//  ██████╗ ██████╗ ███████╗    ██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗
//  ██╔══██╗██╔══██╗██╔════╝    ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝
//  ██████╔╝██████╔╝█████╗█████╗██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗
//  ██╔═══╝ ██╔══██╗██╔══╝╚════╝██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║
//  ██║     ██║  ██║███████╗    ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║
//  ╚═╝     ╚═╝  ╚═╝╚══════╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝
//
//  ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗
//  ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
//  ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║
//  ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║
//  ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝
//  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
//

var _ = require('@sailshq/lodash');
var utils = require('waterline-utils');
var ObjectID = require('mongodb').ObjectID;
var eachRecordDeep = utils.eachRecordDeep;

module.exports = function preProcessRecord(options) {
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

    // TODO: adjust to work like this:
    //
    // If trying to set the _id value explicitly, store it as an
    // ObjectID rather than a string.
    if (_.has(record, '_id')) {
      delete record._id;
    }

    // For each singular association where an explicit foreign key value was provided
    // in this new record, first validate that it is a valid Mongo ID string, then
    // instantiate a new Mongo ObjectID instance and swap out the original string in
    // the new record before proceeding.
    _.each(WLModel.definition, function findForeignKeys(def) {
      if (!def.foreignKey) { return; }
      var pRecordKey = def.columnName;
      if (_.isUndefined(record[pRecordKey])) { return; }

      try {
        var mongoid = new ObjectID(record[pRecordKey]);

        // If, after objectifying this into a Mongo ID instance and then toStringing it,
        // we determine that it is equal to the original value, then it's a mongo id.
        // This works because when a valid ObjectID is created it's preserved.
        if (mongoid.toString() === record[pRecordKey]) {
          record[pRecordKey] = mongoid;
        }

      } catch (e) {
        // TODO: throw a prettified version of this error
        return;
      }

    });//</_.each()>

  }, false, options.identity, options.orm);
  // ^^TODO: use `true` instead of `false` here
};
