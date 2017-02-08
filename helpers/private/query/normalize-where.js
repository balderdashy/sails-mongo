/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var parseObjectId = require('./parse-object-id');

module.exports = function normalizeWhereClause(_whereClause) {
  // Clone the where clause so that we don't modify the original query object.
  var whereClause = _.cloneDeep(_whereClause);

  // Handle empty where clause
  if (_.isPlainObject(whereClause) && !_.keys(whereClause).length) {
    return whereClause;
  }

  return (function transformBranch(branch) {
    var loneKey = _.first(_.keys(branch));
    var val = branch[loneKey];

    if (loneKey === 'and' || loneKey === 'or') {
      branch['$' + loneKey] = _.map(val, transformBranch);
      delete branch[loneKey];
      return branch;
    }

    if (!_.isObject(val)) {
      // Parse the val and check for an ObjectId as a string
      branch[loneKey] = parseObjectId(val);
      return branch;
    }

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
        val['$ne'] = parseObjectId(modified);
        break;

      case 'nin':
        // Parse NIN queries and convert string _id values to ObjectId's
        modified = _.map(modified, function parse(item) {
          return parseObjectId(item);
        });

        val['$nin'] = modified;
        break;

      case 'in':
        // Parse IN queries and convert string _id values to ObjectId's
        modified = _.map(modified, function parse(item) {
          return parseObjectId(item);
        });

        val['$in'] = modified;
        break;

      case 'like':
        val['$regex'] = new RegExp('^' + _.escapeRegExp(modified).replace(/^%/, '.*').replace(/([^\\])%/g, '$1.*').replace(/\\%/g, '%') + '$');
        break;

      default:
        throw new Error('Consistency violation: where-clause modifier `' + modifier + '` is not valid!');

    }

    return branch;
  })(whereClause);
};
