/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var normalizeMongoObjectId = require('./normalize-mongo-object-id');


/**
 * reifyValuesToSet()
 *
 * Prepare a dictionary of values to be used in a native database operation.
 * > The provided `valuesToSet` will be mutated in-place.
 *
 * @param {Ref} valuesToSet
 * @param {Ref} WLModel
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @throws {E_CANNOT_INTERPRET_AS_OBJECTID}
 */

module.exports = function reifyValuesToSet(valuesToSet, WLModel) {
  assert(!_.isUndefined(valuesToSet),'1st argument is required');
  assert(_.isObject(valuesToSet) && !_.isArray(valuesToSet) && !_.isFunction(valuesToSet),'1st argument must be a dictionary');
  assert(!_.isUndefined(WLModel),'2nd argument is required');
  assert(_.isObject(valuesToSet) && !_.isArray(valuesToSet) && !_.isFunction(valuesToSet),'2nd argument must be a WLModel, and it has to have a `definition` property for this utility to work.');


  // If trying to set the PK value explicitly (e.g. `_id`), try to interpret it
  // as a hex string, instantiate a Mongo ObjectId instance for it, and swap out
  // the original string for that instead before proceeding.
  // (Why?  See http://stackoverflow.com/a/27897720/486547)
  var primaryKeyAttrName = WLModel.primaryKey;
  var primaryKeyColumnName = WLModel.attributes[WLModel.primaryKey].columnName;
  var pkValue = valuesToSet[primaryKeyColumnName];
  // If the PK value is set to `null`, then remove it.
  // > Remember: `null` here has special meaning in Waterline -- it means there
  // > was no explicit PK value provided on a create().)
  if (_.isNull(pkValue) || _.isUndefined(pkValue)) {
    delete valuesToSet[primaryKeyColumnName];
  }
  else {
    try {
      valuesToSet[primaryKeyColumnName] = normalizeMongoObjectId(pkValue);
    } catch (e) {
      switch (e.code) {
        case 'E_CANNOT_INTERPRET_AS_OBJECTID': throw flaverr(e.code, new Error('Invalid primary key value provided for `'+primaryKeyAttrName+'`.  '+e.message));
        default: throw e;
      }
    }
  }//>-


  // Now we'll do the same thing for any explicit foreign keys that were provided.
  // (i.e. for singular associations)
  _.each(WLModel.attributes, function (attrDef, attrName) {
    var phRecordKey = attrDef.columnName;
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: change this to do it this way:
    // ```
    // var isForeignKey = !!attrDef.model;
    // ```
    // ...instead of this way:
    // ```
    var isForeignKey = !!attrDef.foreignKey;
    // ```
    // (requires tweaks in WL core... maybe-- need to check)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    if (!isForeignKey) { return; }
    if (_.isUndefined(valuesToSet[phRecordKey])) { return; }

    // If the FK was provided as `null`, then it's automatically OK.
    if (_.isNull(valuesToSet[phRecordKey])) {
      return;
    }//-•

    // But otherwise, we'll attempt to convert it into an ObjectID instance.
    try {
      valuesToSet[phRecordKey] = normalizeMongoObjectId(valuesToSet[phRecordKey]);
    } catch (e) {
      switch (e.code) {
        case 'E_CANNOT_INTERPRET_AS_OBJECTID': throw flaverr(e.code, new Error('Invalid replacement foreign key value provided for association (`'+attrName+'`).  '+e.message));
        default: throw e;
      }
    }//</catch>

  });//</_.each()>

};
