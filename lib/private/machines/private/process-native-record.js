/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var ObjectId = require('mongodb').ObjectID || require('mongodb').ObjectId;
var Binary = require('mongodb').Binary;



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

  // Determine whether or not to use object ids.
  var useObjectIds = !meta || !meta.modelsNotUsingObjectIds || !_.contains(meta.modelsNotUsingObjectIds, WLModel.identity);


  // Convert pk values (instantiated ObjectIds) back to hex strings. (if relevant)
  if (useObjectIds) {
    var primaryKeyColumnName = WLModel.attributes[WLModel.primaryKey].columnName;
    var pkValue = nativeRecord[primaryKeyColumnName];
    if (_.isObject(pkValue) && pkValue instanceof ObjectId) {
      nativeRecord[primaryKeyColumnName] = pkValue.toString();
    }
    else {
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: Log a warning for non-object ID instances
      // (handles existing/non-Waterline data in the mongo database which
      // might have had a non-object ID was stored at some point)
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    }
  }//>-


  // Check out each known attribute...
  _.each(WLModel.attributes, function (attrDef) {
    var phRecordKey = attrDef.columnName;

    // Detect any `type: 'ref'` attributes that were retrieved as Binary objects,
    // and transform them back to Buffer objects.
    // > This way you can create and retrieve attributes containing buffers transparently.
    //
    // If the column has `type: ref` and the value is a Mongo binary object with a buffer, just
    // return the buffer to be consistent w/ how other core adapters handle refs.
    if (attrDef.type === 'ref' && _.isObject(nativeRecord[phRecordKey]) && nativeRecord[phRecordKey] instanceof Binary && nativeRecord[phRecordKey].buffer) {
      nativeRecord[phRecordKey] = nativeRecord[phRecordKey].buffer;
      return;
    }//-•

    var isForeignKey = !!attrDef.model;
    // Sanity checks:
    if (isForeignKey) {
      assert(attrDef.foreignKey, 'attribute has a `model` property, but wl-schema did not give it `foreignKey: true`!');
    }
    else {
      assert(!attrDef.foreignKey, 'wl-schema gave this attribute `foreignKey: true`, but it has no `model` property!');
    }

    if (!isForeignKey) { return; }//-•
    if (_.isUndefined(nativeRecord[phRecordKey])) { /* This is weird, but WL core deals with warning about it. */ return; }//-•
    if (_.isNull(nativeRecord[phRecordKey])) { return; }//-•

    // Now, if relevant, convert ObjectId foreign keys to hex strings. (i.e. for singular associations)
    if (!meta || !meta.modelsNotUsingObjectIds || !_.contains(meta.modelsNotUsingObjectIds, attrDef.model)) {
      if (_.isObject(nativeRecord[phRecordKey]) && nativeRecord[phRecordKey] instanceof ObjectId) {
        nativeRecord[phRecordKey] = nativeRecord[phRecordKey].toString();
      }
      else {
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // FUTURE: Log a warning for non-object ID instances
        // (handles existing/non-Waterline data in the mongo database which
        // might have had a non-object ID was stored at some point)
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      }
    }//>-

  });//</_.each()>

};
