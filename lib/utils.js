
/**
 * Module Dependencies
 */

var _ = require('lodash'),
    ObjectId = require('mongodb').ObjectID,
    url = require('url');

/**
 * ignore
 */

exports.object = {};

/**
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 * @return {Boolean}
 * @api public
 */

var hop = Object.prototype.hasOwnProperty;
exports.object.hasOwnProperty = function(obj, prop) {
  return hop.call(obj, prop);
};

/**
 * Re-Write Mongo's _id attribute to a normalized id attribute
 *
 * @param {Array} models
 * @api public
 */

exports.rewriteIds = function rewriteIds(models, schema) {
  var _models = models.map(function(model) {
    if(hop.call(model, '_id')) {
      // change id to string only if it's necessary
      if(typeof model._id === 'object')
        model.id = model._id.toString();
      else
        model.id = model._id;
      delete model._id;
    }

    // Rewrite any foreign keys if a schema is available
    if(!schema) return model;

    Object.keys(schema).forEach(function(key) {
      var foreignKey = schema[key].foreignKey || false;

      // If a foreignKey, check if value matches a mongo id and if so turn it into an objectId
      if(foreignKey && model[key] instanceof ObjectId) {
        model[key] = model[key].toString();
      }
    });

    return model;
  });

  return _models;
};

/**
 * Check if an ID resembles a Mongo BSON ID.
 * Can't use the `hop` helper above because BSON ID's will have their own hasOwnProperty value.
 *
 * @param {String} id
 * @return {Boolean}
 * @api public
 */

exports.matchMongoId = function matchMongoId(id) {
  if (id === null) return false;
  var test = _.cloneDeep(id);
  if(typeof test.toString !== 'undefined') test = id.toString();
  return test.match(/^[a-fA-F0-9]{24}$/) ? true : false;
};

/**
 * Case Insensitive
 *
 * Wrap a value in a case insensitive regex
 * /^foobar$/i
 *
 * NOTE: this is really bad for production currently,
 * when you use a regex in the query it won't hit any
 * indexes. We need to fix this ASAP but for now it passes
 * all the waterline tests.
 *
 * @param {String} val
 * @return {String}
 * @api public
 */

exports.caseInsensitive = function caseInsensitive(val) {
  if(!_.isString(val)) return val;
  return val.replace(/[-[\]{}()+?*.\/,\\^$|#]/g, "\\$&");
};

/**
 * Parse URL string from config
 *
 * Parse URL string into connection config parameters
 *
 * @param {Object} config
 * @return {Object}
 * @api public
 */

exports.parseUrl = function parseUrl(config) {
  if(!_.isString(config.url)) return config;

  var obj = url.parse(config.url);

  config.host = obj.hostname || config.host;
  config.port = obj.port || config.port;

  if(_.isString(obj.path)) {
    config.database = obj.path.split("/")[1] || config.database;
  }

  if(_.isString(obj.auth)) {
    config.user = obj.auth.split(":")[0] || config.user;
    config.password = obj.auth.split(":")[1] || config.password;
  }

  return config;
};
