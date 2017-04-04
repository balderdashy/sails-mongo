/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var normalizeMongoObjectId = require('./normalize-mongo-object-id');


/**
 * buildMongoWhereClause()
 *
 * Build a Mongo "query filter" from the specified S3Q `where` clause.
 * > Note: The provided `where` clause is NOT mutated.
 *
 * @param  {Dictionary} whereClause [`where` clause from the criteria of a S3Q]
 * @param  {Ref} WLModel
 * @param  {Dictionary?} meta       [`meta` query key from the s3q]
 *
 * @returns {Dictionary}            [Mongo "query filter"]
 */
module.exports = function buildMongoWhereClause(whereClause, WLModel, meta) {

  // Handle empty `where` clause.
  if (_.keys(whereClause).length === 0) {
    return whereClause;
  }

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: don't do this:
  // ```
  // Clone the where clause so that we don't modify the original query object.
  whereClause = _.cloneDeep(whereClause);
  // ```
  // ^^^that might clobber instances like already-instantiated ObjectIds!
  // Instead, clone on the fly.
  //
  // Also note that we might just be able to let it do this destructively, depending
  // on how this is used. (FUTURE: double-check usage of this utility in mp-mongo and
  // also polypopulate in WL core)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Recursively build and return a transformed `where` clause for use with Mongo.
  var mongoQueryFilter = (function recurse(branch) {
    var loneKey = _.first(_.keys(branch));

    //  ╔═╗╦═╗╔═╗╔╦╗╦╔═╗╔═╗╔╦╗╔═╗
    //  ╠═╝╠╦╝║╣  ║║║║  ╠═╣ ║ ║╣
    //  ╩  ╩╚═╚═╝═╩╝╩╚═╝╩ ╩ ╩ ╚═╝
    if (loneKey === 'and' || loneKey === 'or') {
      var conjunctsOrDisjuncts = branch[loneKey];
      branch['$' + loneKey] = _.map(conjunctsOrDisjuncts, function(conjunctOrDisjunct){
        return recurse(conjunctOrDisjunct);
      });
      delete branch[loneKey];
      return branch;
    }//-•

    // IWMIH, we're dealing with a constraint of some kind.
    var constraintColumnName = loneKey;
    var constraint = branch[constraintColumnName];


    // Determine whether we should compare as an object id.
    //
    // > i.e. determine if this constraint applies to either the primary key attribute
    // > or a foreign key attribute (singular assoc.)
    // >
    // > We'll use this below to apply the conventional behavior of searching
    // > by ObjectID.  That is, if this constraint applies to a PK or FK, then
    // > try to convert the eq constraint / relevant modifier into an ObjectId
    // > instance, if possible. (We still gracefully fall back to tolerate
    // > filtering by pk/fk vs. miscellaneous strings.)
    var doCompareAsObjectIdIfPossible;

    assert(_.isString(WLModel.primaryKey) && WLModel.primaryKey, 'Model def should always have a `primaryKey` setting by the time the model definition is handed down to the adapter (this should have already been taken care of in WL core)');
    var pkAttrDef = WLModel.attributes[WLModel.primaryKey];
    assert(_.isObject(pkAttrDef), 'PK attribute should always exist (this should have already been taken care of in WL core)');
    var pkColumnName = pkAttrDef.columnName;
    assert(_.isString(pkColumnName) && pkColumnName, 'PK attribute should always have a column name by the time the model definition is handed down to the adapter (this should have already been taken care of in WL core).  But actual pk attribute def on the model looks like this: '+util.inspect(pkAttrDef, {depth:5})+'');

    if (constraintColumnName === pkColumnName && (!meta || !meta.modelsNotUsingObjectIds || !_.contains(meta.modelsNotUsingObjectIds, WLModel.identity))) {
      doCompareAsObjectIdIfPossible = true;
    }
    else {
      _.each(WLModel.attributes, function (attrDef /*, attrName */) {
        var isForeignKey = !!attrDef.model;
        // Sanity checks:
        if (isForeignKey) {
          assert(attrDef.foreignKey, 'attribute has a `model` property, but wl-schema did not give it `foreignKey: true`!');
        }
        else {
          assert(!attrDef.foreignKey, 'wl-schema gave this attribute `foreignKey: true`, but it has no `model` property!');
        }

        if (!isForeignKey) { return; }
        if (constraintColumnName === attrDef.columnName && (!meta || !meta.modelsNotUsingObjectIds || !_.contains(meta.modelsNotUsingObjectIds, attrDef.model))) {
          doCompareAsObjectIdIfPossible = true;
        }
      });
    }

    //  ╔═╗╔═╗   ╔═╗╔═╗╔╗╔╔═╗╔╦╗╦═╗╔═╗╦╔╗╔╔╦╗
    //  ║╣ ║═╬╗  ║  ║ ║║║║╚═╗ ║ ╠╦╝╠═╣║║║║ ║
    //  ╚═╝╚═╝╚  ╚═╝╚═╝╝╚╝╚═╝ ╩ ╩╚═╩ ╩╩╝╚╝ ╩
    if (_.isString(constraint) || _.isNumber(constraint) || _.isBoolean(constraint) || _.isNull(constraint)) {

      if (doCompareAsObjectIdIfPossible && _.isString(constraint)) {
        try {
          branch[constraintColumnName] = normalizeMongoObjectId(constraint);
        } catch (e) {
          switch (e.code) {
            case 'E_CANNOT_INTERPRET_AS_OBJECTID': break;
            default: throw e;
          }
        }
      }//>-

      return branch;
    }//-•

    //  ╔═╗╔═╗╔╦╗╔═╗╦  ╔═╗═╗ ╦  ╔═╗╔═╗╔╗╔╔═╗╔╦╗╦═╗╔═╗╦╔╗╔╔╦╗
    //  ║  ║ ║║║║╠═╝║  ║╣ ╔╩╦╝  ║  ║ ║║║║╚═╗ ║ ╠╦╝╠═╣║║║║ ║
    //  ╚═╝╚═╝╩ ╩╩  ╩═╝╚═╝╩ ╚═  ╚═╝╚═╝╝╚╝╚═╝ ╩ ╩╚═╩ ╩╩╝╚╝ ╩
    var modifierKind = _.first(_.keys(constraint));
    var modifier = constraint[modifierKind];
    delete constraint[modifierKind];


    switch (modifierKind) {

      case '<':
        constraint['$lt'] = modifier;
        break;

      case '<=':
        constraint['$lte'] = modifier;
        break;

      case '>':
        constraint['$gt'] = modifier;
        break;

      case '>=':
        constraint['$gte'] = modifier;
        break;

      case '!=':

        // Same as above: Convert mongo id(s) to ObjectId instance(s) if appropriate/possible.
        if (doCompareAsObjectIdIfPossible && _.isString(modifier)) {
          try {
            modifier = normalizeMongoObjectId(modifier);
          } catch (e) {
            switch (e.code) {
              case 'E_CANNOT_INTERPRET_AS_OBJECTID': break;
              default: throw e;
            }
          }
        }//>-

        constraint['$ne'] = modifier;

        break;

      case 'nin':

        // Same as above: Convert mongo id(s) to ObjectId instance(s) if appropriate/possible.
        modifier = _.map(modifier, function (item) {
          if (doCompareAsObjectIdIfPossible && _.isString(item)) {
            try {
              item = normalizeMongoObjectId(item);
            } catch (e) {
              switch (e.code) {
                case 'E_CANNOT_INTERPRET_AS_OBJECTID': break;
                default: throw e;
              }
            }
          }//>-
          return item;
        });//</_.map()>

        constraint['$nin'] = modifier;
        break;

      case 'in':

        // console.log('original `in` modifier:', modifier);
        // console.log('typeof the first one:', typeof modifier[0]);
        // console.log('doCompareAsObjectIdIfPossible:', doCompareAsObjectIdIfPossible);

        // Same as above: Convert mongo id(s) to ObjectId instance(s) if appropriate/possible.
        modifier = _.map(modifier, function (item) {
          if (doCompareAsObjectIdIfPossible && _.isString(item)) {
            try {
              item = normalizeMongoObjectId(item);
            } catch (e) {
              switch (e.code) {
                case 'E_CANNOT_INTERPRET_AS_OBJECTID': break;
                default: throw e;
              }
            }
          }//>-
          return item;
        });//</_.map()>
        // console.log('Mongo-ified $in:', modifier);
        // console.log('typeof the first one:', typeof modifier[0]);

        constraint['$in'] = modifier;
        break;

      case 'like':
        constraint['$regex'] = new RegExp('^' + _.escapeRegExp(modifier).replace(/^%/, '.*').replace(/([^\\])%/g, '$1.*').replace(/\\%/g, '%') + '$');
        break;

      default:
        throw new Error('Consistency violation: `where` clause modifier `' + modifierKind + '` is not valid!  This should never happen-- a stage 3 query should have already been normalized in Waterline core.');

    }

    return branch;
  })(whereClause);

  // Return the "mongo query filter".
  // (see https://docs.mongodb.com/manual/core/document/#document-query-filter)
  return mongoQueryFilter;
};
