/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var ObjectId = require('machinepack-mongo').mongodb.ObjectID || require('machinepack-mongo').mongodb.ObjectId;



/**
 * processNativeRecord()
 *
 * Modify a native record coming back from the database so that it matches
 * the expectations of the adapter spec (i.e. still a physical record, but
 * minus any database-specific eccentricities).
 *
 * @param {Ref} nativeRecord
 * @param {Ref} WLModel
 * @param  {Dictionary?} meta       [`meta` query key from the s3q]
 */

module.exports = function processNativeRecord(nativeRecord, WLModel, meta) {
  assert(!_.isUndefined(nativeRecord),'1st argument is required');
  assert(_.isObject(nativeRecord) && !_.isArray(nativeRecord) && !_.isFunction(nativeRecord),'1st argument must be a dictionary');
  assert(!_.isUndefined(WLModel),'2nd argument is required');
  assert(_.isObject(nativeRecord) && !_.isArray(nativeRecord) && !_.isFunction(nativeRecord),'2nd argument must be a WLModel, and it has to have a `definition` property for this utility to work.');


  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: if the nativeRecord does not have `_id`, then throw a special error.
  // (This could be used to leave the decision of what to do entirely up to the
  // caller to  e.g. log a warning and add its index in the array to a list of records
  // that will be excluded from the results)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


  // Only attempt to work witih object ids if `useObjectIds` meta key is enabled.
  if (!meta || !meta.useObjectIds) {
    // return;
    // ^^TODO: Uncomment this (Temporarily leaving it out to make sure everything works)
  }//-•


  // Convert pk values (instantiated ObjectIds) back to hex strings.
  var primaryKeyColumnName = WLModel.attributes[WLModel.primaryKey].columnName;
  var pkValue = nativeRecord[primaryKeyColumnName];
  if (pkValue instanceof ObjectId) {
    nativeRecord[primaryKeyColumnName] = pkValue.toString();
  }
  else {
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Log a warning for non-object ID instances
    // (handles existing/non-Waterline data in the mongo database which
    // might have had a non-object ID was stored at some point)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  }


  // Now we'll do the same thing for any foreign keys.
  // (i.e. for singular associations)
  _.each(WLModel.attributes, function (attrDef) {
    var phRecordKey = attrDef.columnName;
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // TODO: change this to do it this way:
    // ```
    // var isForeignKey = !!attrDef.model;
    // ```
    // ...instead of this way:
    // ```
    var isForeignKey = !!attrDef.foreignKey;
    // ```
    // (requires tweaks in WL core... maybe-- need to check)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    if (!isForeignKey) { return; }//-•
    if (_.isUndefined(nativeRecord[phRecordKey])) { /* This is weird, but WL core deals with warning about it. */ return; }//-•
    if (_.isNull(nativeRecord[phRecordKey])) { return; }//-•

    if (nativeRecord[phRecordKey] instanceof ObjectId) {
      nativeRecord[phRecordKey] = nativeRecord[phRecordKey].toString();
    }
    else {
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: Log a warning for non-object ID instances
      // (handles existing/non-Waterline data in the mongo database which
      // might have had a non-object ID was stored at some point)
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    }

  });//</_.each()>

};
