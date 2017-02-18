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
var ObjectID = require('machinepack-mongo').mongodb.ObjectID;
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

  // Iterate over the incoming records in order to perform database-specific
  // validations and normalizations.
  // > (This should *never* go more than one level deep!)
  eachRecordDeep(options.records, function iteratee(record, WLModel, depth) {
    if (depth !== 1) { throw new Error('Consistency violation: Incoming new records in a s3q should never necessitate deep iteration!  If you are seeing this error, it is probably because of a bug in this adapter, or in Waterline core.'); }


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
    var dryAttrDefs = WLModel.definition;
    _.each(dryAttrDefs, function normalizeForeignKeys(dryAttrDef) {
      if (!dryAttrDef.foreignKey) { return; }
      var pRecordKey = dryAttrDef.columnName;
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

  }, true, options.identity, options.orm);

};
