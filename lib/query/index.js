
/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var ObjectId = require('mongodb').ObjectID;
var validator = require('validator');
var Aggregate = require('./aggregate');
var utils = require('../utils');
var hop = utils.object.hasOwnProperty;

/**
 * Query Constructor
 *
 * Normalizes Waterline queries to work with Mongo.
 *
 * @param {Object} options
 * @param {Object} [config]
 * @api private
 */

var Query = module.exports = function Query(options, schema, config) {

  // Flag as an aggregate query or not
  this.aggregate = false;

  // Cache the schema for use in parseTypes
  this.schema = schema;

  // Hold the config object
  this.config = config || {};

  // Check for Aggregate Options
  this.checkAggregate(options);

  // Retrieve select fields from criteria
  if (options && typeof options === 'object' && options.select) {
    this.select = this.parseSelect(options.select);
    delete options.select;
  } else {
    this.select = {};
  }

  // Normalize Criteria
  this.criteria = this.normalizeCriteria(options);

  return this;
};

/**
 * Check For Aggregates
 *
 * Checks the options to determine if an aggregate query is needed.
 *
 * @param {Object} options
 * @api private
 */

Query.prototype.checkAggregate = function checkAggregate(options) {
  var aggregateOptions = ['groupBy', 'sum', 'average', 'min', 'max'];
  var aggregates = _.intersection(aggregateOptions, Object.keys(options));

  if(aggregates.length === 0) return options;

  this.aggregateGroup = new Aggregate(options);
  this.aggregate = true;
};


/**
 * Normalize Criteria
 *
 * Transforms a Waterline Query into a query that can be used
 * with MongoDB. For example it sets '>' to $gt, etc.
 *
 * @param {Object} options
 * @return {Object}
 * @api private
 */

Query.prototype.normalizeCriteria = function normalizeCriteria(options) {
  "use strict";
  var self = this;

  return _.mapValues(options, function (original, key) {
    if (key === 'where') return self.parseWhere(original);
    if (key === 'sort')  return self.parseSort(original);
    return original;
  });
};


/**
 * Parse Where
 *
 * <where> ::= <clause>
 *
 * @api private
 *
 * @param original
 * @returns {*}
 */
Query.prototype.parseWhere = function parseWhere(original) {
  "use strict";
  var self = this;

  // Fix an issue with broken queries when where is null
  if(_.isNull(original)) return {};

  return self.parseClause(original);
};


/**
 * Parse Clause
 *
 * <clause> ::= { <clause-pair>, ... }
 *
 * <clause-pair> ::= <field> : <expression>
 *                 | or|$or: [<clause>, ...]
 *                 | $or   : [<clause>, ...]
 *                 | $and  : [<clause>, ...]
 *                 | $nor  : [<clause>, ...]
 *                 | like  : { <field>: <expression>, ... }
 *
 * @api private
 *
 * @param original
 * @returns {*}
 */
Query.prototype.parseClause = function parseClause(original) {
  "use strict";
  var self = this;

  return _.reduce(original, function parseClausePair(obj, val, key) {
    "use strict";

    // Normalize `or` key into mongo $or
    if (key.toLowerCase() === 'or') key = '$or';

    // handle Logical Operators
    if (['$or', '$and', '$nor'].indexOf(key) !== -1) {
      // Value of $or, $and, $nor require an array, else ignore
      if (_.isArray(val)) {
        val = _.map(val, function (clause) {
          return self.parseClause(clause);
        });

        obj[key] = val;
      }
    }

    // handle Like Operators for WQL (Waterline Query Language)
    else if (key.toLowerCase() === 'like') {
      // transform `like` clause into multiple `like` operator expressions
      _.extend(obj, _.reduce(val, function parseLikeClauses(likes, expression, field) {
        likes[field] = self.parseExpression(field, { like: expression });
        return likes;
      }, {}));
    }

    // Default
    else {
      val = self.parseExpression(key, val);

      // Normalize `id` key into mongo `_id`
      if (key === 'id' && !hop(this, '_id')) key = '_id';

      obj[key] = val;
    }

    return obj;
  }, {}, original);
};


/**
 * Parse Expression
 *
 * <expression> ::= { <!|not>: <value> | [<value>, ...] }
 *                | { <$not>: <expression>, ... }
 *                | { <modifier>: <value>, ... }
 *                | [<value>, ...]
 *                | <value>

 * @api private
 *
 * @param field
 * @param expression
 * @returns {*}
 */
Query.prototype.parseExpression = function parseExpression(field, expression) {
  "use strict";
  var self = this;

  // Recursively parse nested unless value is a date
  if (_.isPlainObject(expression) && !_.isDate(expression)) {
    return _.reduce(expression, function (obj, val, modifier) {

      // Handle `not` by transforming to $not, $ne or $nin
      if (modifier === '!' || modifier.toLowerCase() === 'not') {

        if (_.isPlainObject(val) && !_.has(val, '_bsontype')) {
          obj['$not'] = self.parseExpression(field, val);
          return obj;
        }

        modifier = _.isArray(val) ? '$nin' : '$ne';
        val = self.parseValue(field, modifier, val);
        obj[modifier] = val;
        return obj;
      }

      // WQL Evaluation Modifiers for String
      if (_.isString(val)) {
        // Handle `contains` by building up a case insensitive regex
        if(modifier === 'contains') {
          val = utils.caseInsensitive(val);
          val =  '[\\s\\S]*' + val + '[\\s\\S]*';
          obj['$regex'] = new RegExp('^' + val + '$', 'i');
          return obj;
        }

        // Handle `like`
        if(modifier === 'like') {
          val = utils.caseInsensitive(val);
          val = val.replace(/%/g, '[\\s\\S]*');
          obj['$regex'] = new RegExp('^' + val + '$', 'i');
          return obj;
        }

        // Handle `startsWith` by setting a case-insensitive regex
        if(modifier === 'startsWith') {
          val = utils.caseInsensitive(val);
          val =  val + '[\\s\\S]*';
          obj['$regex'] = new RegExp('^' + val + '$', 'i');
          return obj;
        }

        // Handle `endsWith` by setting a case-insensitive regex
        if(modifier === 'endsWith') {
          val = utils.caseInsensitive(val);
          val =  '[\\s\\S]*' + val;
          obj['$regex'] = new RegExp('^' + val + '$', 'i');
          return obj;
        }
      }

      // Handle `lessThan` by transforming to $lt
      if(modifier === '<' || modifier === 'lessThan' || modifier.toLowerCase() === 'lt') {
        obj['$lt'] = self.parseValue(field, modifier, val);
        return obj;
      }

      // Handle `lessThanOrEqual` by transforming to $lte
      if(modifier === '<=' || modifier === 'lessThanOrEqual' || modifier.toLowerCase() === 'lte') {
        obj['$lte'] = self.parseValue(field, modifier, val);
        return obj;
      }

      // Handle `greaterThan` by transforming to $gt
      if(modifier === '>' || modifier === 'greaterThan' || modifier.toLowerCase() === 'gt') {
        obj['$gt'] = self.parseValue(field, modifier, val);
        return obj;
      }

      // Handle `greaterThanOrEqual` by transforming to $gte
      if(modifier === '>=' || modifier === 'greaterThanOrEqual' || modifier.toLowerCase() === 'gte') {
        obj['$gte'] = self.parseValue(field, modifier, val);
        return obj;
      }

      obj[modifier] = self.parseValue(field, modifier, val);
      return obj;
    }, {});
  }

  // <expression> ::= [value, ...], normalize array into mongo $in operator expression
  if (_.isArray(expression)) {
    return { $in: self.parseValue(field, '$in', expression) };
  }

  // <expression> ::= <value>, default equal expression
  return self.parseValue(field, undefined, expression);
};


/**
 * Parse Value
 *
 * <value> ::= RegExp | Number | String
 *           | [<value>, ...]
 *           | <plain object>
 *
 * @api private
 *
 * @param field
 * @param modifier
 * @param val
 * @returns {*}
 */
Query.prototype.parseValue = function parseValue(field, modifier, val) {
  "use strict";
  var self = this;

  // Omit adding regex value to these modifiers
  var omitRegExModifiers = ['$ne', 'greaterThan', '>', 'gt', 'greaterThanOrEqual',
                            '>=', 'gte', '$gt', '$gte', '<', 'lessThan', '<=',
                            'lessThanOrEqual'
                           ];

  // Look and see if the key is in the schema, id attribute and all association
  // attributes are objectid type by default (@see { @link collection._parseDefinition }).
  if (hop(self.schema, field) && self.schema[field].type === 'objectid') {

    // Check for array of Mongo ObjectId
    // If we have an array of IDs, attempt to make ObjectIds out of them.
    if (_.isArray(val)) {
      return _.map(val, function (item) {
        return _.isString(item) && utils.matchMongoId(item) ? new ObjectId(item) : item;
      });
    }

    // Check for Mongo ObjectId
    if (_.isString(val) && utils.matchMongoId(val)) {
      return new ObjectId(val.toString());
    }

  }

  if(_.isString(val)) {

    // If we can verify that the field is NOT a string type, translate
    // certain values into booleans, date or null.  Otherwise they'll be left
    // as strings.
    if (hop(self.schema, field) && self.schema[field].type != 'string') {

      if(self.schema[field].type === 'integer'){
        return parseInt(val);
      }

      if(self.schema[field].type === 'float'){
        return parseFloat(val);
      }

      if (val === "false") {
        return false;
      }

      if (val === "true") {
        return true;
      }

      if (val === "null") {
        return null;
      }

      if (self.schema[field].type === 'datetime') {
        return new Date(val);
      }

      if (self.schema[field].type === 'date') {
        return new Date(val);
      }

    }

    if (omitRegExModifiers.indexOf(modifier) > -1) {
      return val;
    }


    // Only if it's not mongodbID, for most of case usage would like:
    // user.find('56173df732776c64852f8c91')
    //
    // Turn wlNext.caseSensitive flag to `true` to enable case sensitive requests when there is no modifier
    if(!validator.isMongoId(val) && !this.config.caseSensitive){
      // Replace Percent Signs, work in a case insensitive fashion by default
      val = utils.caseInsensitive(val);
      val = val.replace(/%/g, '[\\s\\S]*');
      val = new RegExp('^' + val + '$', 'i');
    }

    return val;
  }

  // Array, RegExp, plain object, number
  return val;
};


/**
 * Parse Sort
 *
 * @param original
 * @returns {*}
 */
Query.prototype.parseSort = function parseSort(original) {
  "use strict";
  return _.reduce(original, function (sort, order, field) {
    // Normalize id, if used, into _id
    if (field === 'id') field = '_id';

    // Handle Sorting Order with binary or -1/1 values
    sort[field] = ([0, -1].indexOf(order) > -1) ? -1 : 1;

    return sort;
  }, {});
};
/**
 *
 * Parse Select
 *
 * @param original
 * @returns {*}
 */
Query.prototype.parseSelect = function parseSelect(original) {
  var select = {};

  _.each(original, function (field) {
    select[field] = 1;
  });

  return select;
};
