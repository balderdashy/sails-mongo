
/**
 * Module dependencies
 */

var _ = require('lodash'),
    ObjectId = require('mongodb').ObjectID,
    Aggregate = require('./aggregate'),
    utils = require('../utils'),
    hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Query Constructor
 *
 * Normalizes Waterline queries to work with Mongo.
 *
 * @param {Object} options
 * @api private
 */

var Query = module.exports = function Query(options) {

  // Flag as an aggregate query or not
  this.aggregate = false;

  // Check for Aggregate Options
  this.checkAggregate(options);

  // Normalize Where ID lookup keys
  options = this.normalizeWhereId(options);

  // Normalize reserved query keywords using $
  options = this.parseTypes(options);
  // Normalize Criteria
  this.criteria = this.normalizeCriteria(options);
  // console.log("Q", require('util').inspect(options, false, null));

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
  if(!hasOwnProperty(options, 'where')) return options;

  // Fix an issue with broken queries when where is null
  if(options.where === null) {
    options.where = {};
    return options;
  }

  // Move the id lookup from `id` to `_id`
  if(hasOwnProperty(options.where, 'id') && !hasOwnProperty(options.where, '_id')) {
    options.where['_id'] = _.clone(options.where.id);
    delete options.where.id;
  }

  if(hasOwnProperty(options.where, '_id')) {

    // If we have an array of IDs, attempt to make ObjectIds out of them
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

  function parseObj(obj) {
    Object.keys(obj).forEach(function(key) {
      var val = _.clone(obj[key]);

      // Normalize `or` key into mongo $or
      if(key === 'or') {
        obj['$or'] = val;
        delete obj[key];
        return;
      }

      // Normalize array into mongo $in
      if(Array.isArray(val)) {
        if(key === '$in') return;

        val.forEach(function(arrayVal, i) {
          if(_.isString(arrayVal) && utils.matchMongoId(arrayVal)) {
            val[i] = ObjectId(arrayVal);
          }
        });

        obj[key] = { '$in': val };
        return;
      }

      // Recursivly parse an object
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
  var self = this;
  // console.log("C", require('util').inspect(options, false, null));
  Object.keys(options).forEach(function(key) {
    var original = _.cloneDeep(options[key]);
    self.parseOptions(key, options[key], original);
    options[key] = original;
  });
  return options;
};

/**
 * Parse Options
 *
 * Can be used to recursivly parse an object, tranforming keys along the way.
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
    if(hasOwnProperty(obj, key) && utils.matchMongoId(obj[key])) {

      original[key] = ObjectId(obj[key]);
      return;
    }

    if(_.isString(obj[key])) {
      val = utils.caseInsensitive(obj[key]);
      original[key] = new RegExp('^' + val + '$', 'i');
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

    // Recursivly Parse unless value is a date or a $in array
    if(_.isPlainObject(obj[attr]) && !_.isDate(obj[attr])) {

      // Make sure the object isn't a '!' with a single '$in' key
      if((attr !== '!' && attr !== 'not') || Object.keys(obj[attr]).length > 1) {
        parent = attr;
        self.parseOptions(attr, obj[attr], original, parent);
        return;
      }

    }

    // Check for Mongo IDs
    if(utils.matchMongoId(obj[attr])) {
      return;
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
