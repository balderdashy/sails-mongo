/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var normalizeObjectId = require('./private/normalize-object-id');


/**
 * convertWhereClause()
 *
 * Build a Mongo "query filter" from the specified S3Q `where` clause.
 * > Note: The provided `where` clause is NOT mutated.
 *
 * @param  {Dictionary} whereClause [`where` clause from the criteria of a S3Q]
 * @returns {Dictionary}            [Mongo "query filter"]
 */
module.exports = function convertWhereClause(_whereClause) {

  // Handle empty `where` clause
  if (_.keys(_whereClause).length === 0) {
    return _whereClause;
  }


  // TODO: don't do this
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Clone the where clause so that we don't modify the original query object.
  var whereClause = _.cloneDeep(_whereClause);
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // ^^^that might clobber instances like already-instantiated ObjectIds!
  // Instead, clone on the fly.

  // Recursively build and return a transformed `where` clause for use with Mongo.
  var mongoQueryFilter = (function transformBranch(branch) {
    var loneKey = _.first(_.keys(branch));
    var val = branch[loneKey];

    //  ╔═╗╦═╗╔═╗╔╦╗╦╔═╗╔═╗╔╦╗╔═╗
    //  ╠═╝╠╦╝║╣  ║║║║  ╠═╣ ║ ║╣
    //  ╩  ╩╚═╚═╝═╩╝╩╚═╝╩ ╩ ╩ ╚═╝
    if (loneKey === 'and' || loneKey === 'or') {
      branch['$' + loneKey] = _.map(val, transformBranch);
      delete branch[loneKey];
      return branch;
    }

    //  ╔═╗╔═╗   ╔═╗╔═╗╔╗╔╔═╗╔╦╗╦═╗╔═╗╦╔╗╔╔╦╗
    //  ║╣ ║═╬╗  ║  ║ ║║║║╚═╗ ║ ╠╦╝╠═╣║║║║ ║
    //  ╚═╝╚═╝╚  ╚═╝╚═╝╝╚╝╚═╝ ╩ ╩╚═╩ ╩╩╝╚╝ ╩
    if (!_.isObject(val)) {
      // Parse the val and check for an ObjectId as a string
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // TODO: don't do this unless this constraint actually refers to an attribute
      // for which we might expect a mongo id
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      branch[loneKey] = normalizeObjectId(val);
      return branch;
    }

    //  ╔═╗╔═╗╔╦╗╔═╗╦  ╔═╗═╗ ╦  ╔═╗╔═╗╔╗╔╔═╗╔╦╗╦═╗╔═╗╦╔╗╔╔╦╗
    //  ║  ║ ║║║║╠═╝║  ║╣ ╔╩╦╝  ║  ║ ║║║║╚═╗ ║ ╠╦╝╠═╣║║║║ ║
    //  ╚═╝╚═╝╩ ╩╩  ╩═╝╚═╝╩ ╚═  ╚═╝╚═╝╝╚╝╚═╝ ╩ ╩╚═╩ ╩╩╝╚╝ ╩
    var modifier = _.first(_.keys(val));
    var modified = val[modifier];
    delete val[modifier];

    switch (modifier) {

      case '<':
        val['$lt'] = modified;
        break;

      case '<=':
        val['$lte'] = modified;
        break;

      case '>':
        val['$gt'] = modified;
        break;

      case '>=':
        val['$gte'] = modified;
        break;

      case '!=':
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // TODO: don't do this unless this constraint actually refers to an attribute
        // for which we might expect a mongo id
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        val['$ne'] = normalizeObjectId(modified);
        break;

      case 'nin':
        // Parse NIN queries and convert string _id values to ObjectId's
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // TODO: don't do this unless this constraint actually refers to an attribute
        // for which we might expect an array of mongo ids.
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        modified = _.map(modified, function parse(item) {
          return normalizeObjectId(item);
        });

        val['$nin'] = modified;
        break;

      case 'in':
        // Parse IN queries and convert string _id values to ObjectId's
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // TODO: don't do this unless this constraint actually refers to an attribute
        // for which we might expect an array of mongo ids.
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        modified = _.map(modified, function parse(item) {
          return normalizeObjectId(item);
        });

        val['$in'] = modified;
        break;

      case 'like':
        val['$regex'] = new RegExp('^' + _.escapeRegExp(modified).replace(/^%/, '.*').replace(/([^\\])%/g, '$1.*').replace(/\\%/g, '%') + '$');
        break;

      default:
        throw new Error('Consistency violation: where-clause modifier `' + modifier + '` is not valid!  This should never happen-- a stage 3 query should have already been normalized in Waterline core.');

    }

    return branch;
  })(whereClause);

  // Return the "mongo query filter".
  // (see https://docs.mongodb.com/manual/core/document/#document-query-filter)
  return mongoQueryFilter;
};
