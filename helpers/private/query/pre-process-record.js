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
var ObjectID = require('machinepack-mongo').mongodb.ObjectID;
var eachRecordDeep = require('waterline-utils').eachRecordDeep;

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
    _.each(dryAttrDefs, function normalizeForeignKeys(dryAttrDef, attrName) {
      if (!dryAttrDef.foreignKey) { return; }
      var pRecordKey = dryAttrDef.columnName;
      var isAttrNameSameAsColumnName = (pRecordKey === attrName);
      if (_.isUndefined(record[pRecordKey])) { return; }

      // If the FK was provided as `null`, then it's automatically OK.
      if (_.isNull(record[pRecordKey])) {
        return;
      }//-•

      // But otherwise, we'll attempt to convert it into an ObjectID instance.
      // (this way it'll be in the right format when we send it to Mongo later)
      var originalString = record[pRecordKey];
      try {
        record[pRecordKey] = new ObjectID(originalString);
      } catch (e) {
        throw new Error(
          'Could not instantiate a Mongo ObjectID instance from `'+originalString+'`, the value '+
          'provided for '+(
            'attribute `'+attrName+'`'+(isAttrNameSameAsColumnName?'':' (in mongo, key: `'+pRecordKey+'`)')
          )+'.  Details: '+e.stack
        );
      }

      // Then finally, as a failsafe:
      // If, after objectifying this into a ObjectID instance and then toStringing it,
      // we determine that it is NOT equal to the original string, then we know that
      // the original string must NOT have been a valid mongo id, in some way.
      if (record[pRecordKey].toString() !== originalString) {
        throw new Error(
          'Unexpected behavior when attempting to instantiate a Mongo ObjectID instance '+
          'from `'+originalString+'` for '+(
            'attribute `'+attrName+'`'+(isAttrNameSameAsColumnName?'':' (in mongo, key: `'+pRecordKey+'`)')
          )+'.  After a bit of inspection, it is clear all is not what it seems with this newly instantiated '+
          'ObjectID...  When `.toString()` is run on it, the result (`'+record[pRecordKey].toString()+'`) '+
          'is DIFFERENT than the originally-provided string (`'+originalString+'`) that this ObjectID '+
          'was instantiated from!'
        );
      }//-•

    });//</_.each()>

  }, true, options.identity, options.orm);

};
