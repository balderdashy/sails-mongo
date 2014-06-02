
/**
 * Module dependencies
 */

var _ = require('lodash'),
    ObjectId = require('mongodb').ObjectID,
    Aggregate = require('./aggregate'),
    utils = require('../utils'),
    hop = utils.object.hasOwnProperty;

/**
 * Query Constructor
 *
 * Normalizes Waterline queries to work with Mongo.
 *
 * @param {Object} options
 * @api private
 */

var Query = module.exports = function Query(options, schema) {

  // Flag as an aggregate query or not
  this.aggregate = false;

  // Cache the schema for use in parseTypes
  this.schema = schema;

  // Check for Aggregate Options
  this.checkAggregate(options);

  // Normalize Where ID lookup keys
  // options = this.normalizeWhereId(options);

  // Normalize reserved query keywords using $
  // options = this.parseTypes(options);

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
 * Normalize Where Clause ID's
 *
 * @param {Object} options
 * @return {Object}
 * @api private
 */

Query.prototype.normalizeWhereId = function normalizeWhereId(options) {
  if(!hop(options, 'where')) return options;

  // Fix an issue with broken queries when where is null
  if(options.where === null) {
    options.where = {};
    return options;
  }

  // Move the id lookup from `id` to `_id`
  if(hop(options.where, 'id') && !hop(options.where, '_id')) {
    options.where['_id'] = _.clone(options.where.id);
    delete options.where.id;
  }

  if(hop(options.where, '_id')) {

    // If we have an array of IDs, attempt to make ObjectIds out of them.
    // In Mongo we can assume that all _id will be ObjectIds
    if(Array.isArray(options.where['_id'])) {
      options.where['_id'] = options.where['_id'].map(function(id) {
        return utils.matchMongoId(id.toString()) ? new ObjectId(id.toString()) : id;
      });
    }

    if(utils.matchMongoId(options.where['_id'])) {
      options.where['_id'] = new ObjectId(options.where['_id'].toString());
    }
  }

  return options;
};

/**
 * Parse Types
 *
 * Turn reserved keys into their Mongo equivalent.
 *
 * @param {Object} options
 * @return {Object}
 * @api private
 */

Query.prototype.parseTypes = function parseTypes(options) {
  var self = this;

  function parseObj(obj) {
      Object.keys(obj).forEach(function(key) {
      var val = _.clone(obj[key]);

      if (val === "false") {
        obj[key] = false;
      }
      else if (val === "true") {
        obj[key] = true;
      }
      else if (val === "null") {
        obj[key] = null;
      }

      // if value appears to be a mongo id normalize it as such
      if(_.isString(val) && utils.matchMongoId(val)) {

        // Check key against schema
        if(hop(self.schema, key) && self.schema[key].type === 'objectid') {
          obj[key] = ObjectId(val);
        }

      }

      // Normalize `or` key into mongo $or
      if(key === 'or') {
        obj['$or'] = val;
        delete obj[key];
        return;
      }

      // Normalize array into mongo $in
      if(Array.isArray(val)) {
        if(key === '$in') return;

        // Check key against schema
        if(hop(self.schema, key) && self.schema[key].type === 'objectid') {
          val.forEach(function(arrayVal, i) {
            if(_.isString(arrayVal) && utils.matchMongoId(arrayVal)) {
              val[i] = ObjectId(arrayVal);
            }
          });
        }

        obj[key] = { '$in': val };
        return;
      }

      // Recursively parse an object
      if(_.isPlainObject(val)) {
        obj[key] = parseObj(obj[key]);
        return;
      }
    });

    return obj;
  }

  return parseObj(options);
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
    var obj = _.cloneDeep(original); // Why clone?
    if (key === 'where') return self.parseWhere(obj);
    if (key === 'sort')  return self.parseSort(obj);
    return obj;
  });
};

/**
 * Parse Options
 *
 * Can be used to recursively parse an object, transforming keys along the way.
 *
 * @param {String} key
 * @param {Object} obj
 * @param {Object} original
 * @return {Object}
 * @api private
 */

Query.prototype.parseOptions = function parseOptions(key, obj, original, parent) {
  var self = this,
      val;

  // if obj is null, we have no real way to parse it, so just return
  if(_.isNull(obj)) return;

  // Just case insensitive regex a string unless it's a mongo id
  if(!_.isPlainObject(obj)) {

    // Check for Mongo IDs
    if(hop(obj, key) && utils.matchMongoId(obj[key])) {

      // Check key against schema
      if(hop(self.schema, key) && self.schema[key].type === 'objectid') {
        original[key] = ObjectId(obj[key]);
      }

      return;
    }

    if(_.isString(obj[key])) {
      val = utils.caseInsensitive(obj[key]);
      original[key] = new RegExp('^' + val + '$', 'i');
    }

    if(Array.isArray(obj)) {

      // Check key against schema
      if(hop(self.schema, key) && self.schema[key].type === 'objectid') {

        obj.forEach(function(arrayVal, i) {
          if(_.isString(arrayVal) && utils.matchMongoId(arrayVal)) {
            obj[i] = ObjectId(arrayVal);
          }
        });
      }

      original[key] = { '$in': obj };

      // Normalize id, if used, into _id
      if(key === 'id') {
        var data = _.cloneDeep(original[key]);
        delete original[key];
        original['_id'] = data;
      }
    }

    return;
  }

  // Loop through nested object keys and recurisvly parse them
  Object.keys(obj).forEach(function(attr) {

    // Parse each item in an array
    if(Array.isArray(obj[attr])) {
      var replace = false;

      obj[attr].forEach(function(item, i) {

        // Check that the item is an object
        if(!_.isPlainObject(item)) return;

        // Don't recursively parse '$in' clauses
        if (attr === '$in') return;

        // Flag as replaceable
        replace = true;

        Object.keys(item).forEach(function(itemKey) {
          var val = item[itemKey];

          // If the value is a string we need to make it an object for the parser
          if(_.isString(item[itemKey])) {
            val = {};
            val[itemKey] = item[itemKey];
          }

          self.parseOptions(itemKey, val, item, itemKey);
        });
      });

      if(replace) {
        original[attr] = obj[attr];
      }

      return;
    }

    // Recursively Parse unless value is a date or a $in array
    if(_.isPlainObject(obj[attr]) && !_.isDate(obj[attr])) {

      // Make sure the object isn't a '!' with a single '$in' key
      if((attr !== '!' && attr !== 'not') || Object.keys(obj[attr]).length > 1) {
        parent = attr;
        self.parseOptions(attr, obj[attr], original, parent);
        return;
      }

    }

    // Handle Sorting Order with binary or -1/1 values
    if(key === 'sort') {
      original[attr] = ([0, -1].indexOf(obj[attr]) > -1) ? -1 : 1;
    }

    // Handle `contains` by building up a case insensitive regex
    if(attr === 'contains') {
      val = obj[attr];
      delete original[parent];
      val = utils.caseInsensitive(val);
      original[parent] =  '.*' + val + '.*';
      original[parent] = new RegExp('^' + original[parent] + '$', 'i');
      return;
    }

    // Handle `like`
    if(attr === 'like' || parent === 'like') {
      if(_.isPlainObject(obj[attr])) {
        Object.keys(obj[attr]).forEach(function(_key) {
          original[_key] = original[parent][_key];

          if(_.isString(original[_key])) {
            val = utils.caseInsensitive(original[_key]);
            val = val.replace(/%/g, '.*');
            original[_key] = new RegExp('^' + val + '$', 'i');
          }
        });

        delete original[parent];
        return;
      }

      // Handle non-objects
      var _key;

      if(attr === 'like') {
        _key = parent;
        original[parent] = obj[attr];
        delete original[attr];
      }

      if(parent === 'like') {
        _key = attr;
        original[attr] = obj[attr];
        delete original[parent];
      }

      if(_.isString(original[_key])) {
        val = utils.caseInsensitive(original[_key]);
        val = val.replace(/%/g, '.*');
        original[_key] = new RegExp('^' + val + '$', 'i');
        return;
      }

      return;
    }

    // Handle `startsWith` by setting a case-insensitive regex
    if(attr === 'startsWith') {
      val = obj[attr];
      delete original[parent];
      val = utils.caseInsensitive(val);
      original[parent] =  val + '.*';
      original[parent] = new RegExp('^' + original[parent] + '$', 'i');
      return;
    }

    // Handle `endsWith` by setting a case-insensitive regex
    if(attr === 'endsWith') {
      val = obj[attr];
      delete original[parent];
      val = utils.caseInsensitive(val);
      original[parent] =  '.*' + val;
      original[parent] = new RegExp('^' + original[parent] + '$', 'i');
      return;
    }

    // Handle `lessThan` by transforiming to $lt
    if(attr === 'lessThan' || attr === '<') {
      val = obj[attr];
      delete original[parent][attr];
      original[parent]['$lt'] = val;
      return;
    }

    // Handle `lessThanOrEqual` by transforiming to $lte
    if(attr === 'lessThanOrEqual' || attr === '<=') {
      val = obj[attr];
      delete original[parent][attr];
      original[parent]['$lte'] = val;
      return;
    }

    // Handle `greaterThan` by transforiming to $gt
    if(attr === 'greaterThan' || attr === '>') {
      val = obj[attr];
      delete original[parent][attr];
      original[parent]['$gt'] = val;
      return;
    }

    // Handle `greaterThanOrEqual` by transforiming to $gte
    if(attr === 'greaterThanOrEqual' || attr === '>=') {
      val = obj[attr];
      delete original[parent][attr];
      original[parent]['$gte'] = val;
      return;
    }

    // Handle `not` by transforming to $ne or $nin
    if(attr.toLowerCase() === 'not' || attr === '!') {
      val = obj[attr];
      delete original[parent];

      // Check if the val is an object and contains an $in key
      if(_.isPlainObject(val)) {
        var keys = Object.keys(val);

        if(keys.length === 1 && keys[0] === '$in') {
          original[parent] = { '$nin': val['$in'] };
          return;
        }
      }

      original[parent] = { '$ne': val };
      return;
    }

    // Check for Mongo IDs
    if(utils.matchMongoId(obj[attr])) {

      // Look and see if the key is in the schema
      if(hop(self.schema, attr) && self.schema[attr].type === 'objectid') {
        original[attr] = ObjectId(obj[attr]);
      }

      return;
    }

    // Ignore special attributes
    if(['_bsontype', '_id', 'id'].indexOf(attr) >= 0) return;

    // Replace Percent Signs
    if(_.isString(obj[attr])) {
      val = utils.caseInsensitive(obj[attr]);
      val = val.replace(/%/g, '.*');
      original[attr] = new RegExp('^' + val + '$', 'i');
      return;
    }

  });

  return;
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

        if (_.isPlainObject(val)) {
          obj['$not'] = self.parseExpression(field, val);
        }

        modifier = _.isArray(val) ? '$nin' : '$ne';
        obj[modifier] = self.parseValue(field, modifier, val);
        return obj;
      }

      // WQL Evaluation Modifiers for String
      if (_.isString(val)) {
        // Handle `contains` by building up a case insensitive regex
        if(modifier === 'contains') {
          val = utils.caseInsensitive(val);
          val =  '.*' + val + '.*';
          obj['$regex'] = new RegExp('^' + val + '$', 'i');
          return obj;
        }

        // Handle `like`
        if(modifier === 'like') {
          val = utils.caseInsensitive(val);
          val = val.replace(/%/g, '.*');
          obj['$regex'] = new RegExp('^' + val + '$', 'i');
          return obj;
        }

        // Handle `startsWith` by setting a case-insensitive regex
        if(modifier === 'startsWith') {
          val = utils.caseInsensitive(val);
          val =  val + '.*';
          obj['$regex'] = new RegExp('^' + val + '$', 'i');
          return obj;
        }

        // Handle `endsWith` by setting a case-insensitive regex
        if(modifier === 'endsWith') {
          val = utils.caseInsensitive(val);
          val =  '.*' + val;
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

    if (val === "false") {
      return false;
    }

    if (val === "true") {
      return true;
    }

    if (val === "null") {
      return null;
    }

    // Replace Percent Signs, work in a case insensitive fashion by default
    val = utils.caseInsensitive(val);
    val = val.replace(/%/g, '.*');
    val = new RegExp('^' + val + '$', 'i');
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
  return _.mapValues(original, function (order) {
    // Handle Sorting Order with binary or -1/1 values
    return ([0, -1].indexOf(order) > -1) ? -1 : 1;
  });
};