/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var normalizeMongoObjectId = require('./normalize-mongo-object-id');


/**
 * reifyWhereClause()
 *
 * Build a Mongo "query filter" from the specified S3Q `where` clause.
 * > Note: The provided `where` clause is NOT mutated.
 *
 * @param  {Dictionary} whereClause [`where` clause from the criteria of a S3Q]
 * @returns {Dictionary}            [Mongo "query filter"]
 */
module.exports = function reifyWhereClause(whereClause) {

  // Handle empty `where` clause.
  if (_.keys(whereClause).length === 0) {
    return whereClause;
  }

  // TODO: don't do this
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Clone the where clause so that we don't modify the original query object.
  whereClause = _.cloneDeep(whereClause);
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // ^^^that might clobber instances like already-instantiated ObjectIds!
  // Instead, clone on the fly.
  //
  // Also note that we might just be able to let it do this destructively, depending
  // on how this is used. (TODO: double-check usage of this utility in mp-mongo and
  // also polypopulate in WL core)

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
    }

    // IWMIH, we're dealing with a constraint of some kind.
    var constraint = branch[loneKey];

    //  ╔═╗╔═╗   ╔═╗╔═╗╔╗╔╔═╗╔╦╗╦═╗╔═╗╦╔╗╔╔╦╗
    //  ║╣ ║═╬╗  ║  ║ ║║║║╚═╗ ║ ╠╦╝╠═╣║║║║ ║
    //  ╚═╝╚═╝╚  ╚═╝╚═╝╝╚╝╚═╝ ╩ ╩╚═╩ ╩╩╝╚╝ ╩
    if (_.isString(constraint) || _.isNumber(constraint) || _.isBoolean(constraint) || _.isNull(constraint)) {

      // If this constraint applies to an attribute for which we expect a string
      // that can be instantiated into a Mongo ObjectId, then convert this primitive
      // into an ObjectId instance.
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // TODO: don't do this unless this constraint actually refers to an attribute
      // for which we might expect a mongo id
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      branch[loneKey] = normalizeMongoObjectId(constraint);
      return branch;
    }

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
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // TODO: don't do this unless this constraint actually refers to an attribute
        // for which we might expect a mongo id
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        constraint['$ne'] = normalizeMongoObjectId(modifier);
        break;

      case 'nin':
        // Parse NIN queries and convert string _id values to ObjectId's
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // TODO: don't do this unless this constraint actually refers to an attribute
        // for which we might expect an array of mongo ids.
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        modifier = _.map(modifier, function parse(item) {
          return normalizeMongoObjectId(item);
        });

        constraint['$nin'] = modifier;
        break;

      case 'in':
        // Parse IN queries and convert string _id values to ObjectId's
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // TODO: don't do this unless this constraint actually refers to an attribute
        // for which we might expect an array of mongo ids.
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        modifier = _.map(modifier, function parse(item) {
          return normalizeMongoObjectId(item);
        });

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
