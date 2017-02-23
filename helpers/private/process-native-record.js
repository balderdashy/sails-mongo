/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var ObjectID = require('machinepack-mongo').mongodb.ObjectID;



/**
 * processNativeRecord()
 *
 * Modify a native record coming back from the database so that it matches
 * the expectations of the adapter spec (i.e. still a physical record, but
 * minus any database-specific eccentricities).
 *
 * @param {Ref} nativeRecord
 * @param {Ref} WLModel
 */

module.exports = function processNativeRecord(nativeRecord, WLModel) {
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

  // TODO: move all this stuff together

  // TODO: adjust to work like this:
  // ===========================================================================
  // // Find the Primary Key
  // var primaryKeyAttrName = model.primaryKey;
  // var primaryKeyColumnName = model.definition[primaryKeyAttrName].columnName;
  // ===========================================================================
  // Instead of:
  // -----------
  if (_.has(nativeRecord, '_id')) {

    // This might already be an objectID instance (TODO: check for that and use if possible.  If we're having to instantiate, then log a warning, because it means that a non-object ID was stored at some point.)
    nativeRecord._id = new ObjectID(nativeRecord._id).toString();
  }



  // Also transform any foreign key values to strings
  _.each(WLModel.definition, function findForeignKeys(def) {
    if (_.has(def, 'foreignKey') && def.foreignKey) {
      var attrName = def.columnName;
      if (_.has(nativeRecord, attrName) && !_.isUndefined(nativeRecord[attrName])) {
        try {
          var objectified = new ObjectID(nativeRecord[attrName]);

          // If the objectified is equal to the value then it's a mongo id. This works
          // because when a valid ObjectID is created it's preserved.
          if (objectified.toString() === nativeRecord[attrName].toString()) {
            nativeRecord[attrName] = objectified.toString();
          }
        } catch (e) {
          return;
        }
      }
    }
  });

};
