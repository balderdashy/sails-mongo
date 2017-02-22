/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var ObjectID = require('machinepack-mongo').mongodb.ObjectID;



/**
 * reifyValuesToSet()
 *
 * Prepare a dictionary of values to be used in a native database operation.
 *
 * @param {Ref} valuesToSet
 * @param {Ref} WLModel
 */

module.exports = function reifyValuesToSet(valuesToSet, WLModel) {
  assert(!_.isUndefined(valuesToSet),'1st argument is required');
  assert(_.isObject(valuesToSet) && !_.isArray(valuesToSet) && !_.isFunction(valuesToSet),'1st argument must be a dictionary');
  assert(!_.isUndefined(WLModel),'2nd argument is required');
  assert(_.isObject(valuesToSet) && !_.isArray(valuesToSet) && !_.isFunction(valuesToSet),'1st argument must be a WLModel, and it has to have a `definition` property for this utility to work.');


  // TODO: adjust to work like this:
  // ===========================================================================
  // // Find the Primary Key
  // var primaryKeyAttrName = model.primaryKey;
  // var primaryKeyColumnName = model.definition[primaryKeyAttrName].columnName;
  // ===========================================================================
  // Instead of:
  // -----------
  // If trying to set the _id value explicitly, store it as an
  // ObjectID rather than a string.
  if (_.has(valuesToSet, '_id')) {
    delete valuesToSet._id;
  }

  // For each singular association where an explicit foreign key value was provided
  // in these new values, first validate that it is a valid Mongo ID string, then
  // instantiate a new Mongo ObjectID instance and swap out the original string in
  // the new values before proceeding.
  var dryAttrDefs = WLModel.definition;
  _.each(dryAttrDefs, function (dryAttrDef, attrName) {
    if (!dryAttrDef.foreignKey) { return; }
    var phRecordKey = dryAttrDef.columnName;
    var isAttrNameSameAsColumnName = (phRecordKey === attrName);
    if (_.isUndefined(valuesToSet[phRecordKey])) { return; }

    // If the FK was provided as `null`, then it's automatically OK.
    if (_.isNull(valuesToSet[phRecordKey])) {
      return;
    }//-•

    // But otherwise, we'll attempt to convert it into an ObjectID instance.
    // (this way it'll be in the right format when we send it to Mongo later)
    var originalString = valuesToSet[phRecordKey];
    try {
      valuesToSet[phRecordKey] = new ObjectID(originalString);
    } catch (e) {
      throw new Error(
        'Could not instantiate a Mongo ObjectID instance from `'+originalString+'`, the value '+
        'provided for '+(
          'attribute `'+attrName+'`'+(isAttrNameSameAsColumnName?'':'-- or in mongo (because of a custom "columnName"), key: `'+phRecordKey+'`)')
        )+'.  Details: '+e.stack
      );
    }

    // Then finally, as a failsafe:
    // If, after objectifying this into a ObjectID instance and then toStringing it,
    // we determine that it is NOT equal to the original string, then we know that
    // the original string must NOT have been a valid mongo id, in some way.
    if (valuesToSet[phRecordKey].toString() !== originalString) {
      throw new Error(
        'Unexpected behavior when attempting to instantiate a Mongo ObjectID instance '+
        'from `'+originalString+'` for '+(
          'attribute `'+attrName+'`'+(isAttrNameSameAsColumnName?'':'-- or in mongo (because of a custom "columnName"), key: `'+phRecordKey+'`)')
        )+'.  After a bit of inspection, it is clear all is not what it seems with this newly instantiated '+
        'ObjectID...  When `.toString()` is run on it, the result (`'+valuesToSet[phRecordKey].toString()+'`) '+
        'is DIFFERENT than the originally-provided string (`'+originalString+'`) that this ObjectID '+
        'was instantiated from!'
      );
    }//-•

  });//</_.each()>

};
