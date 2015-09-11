
/**
 * Module Dependencies
 */

var _ = require('lodash'),
    ObjectId = require('mongodb').ObjectID,
    MongoBinary = require('mongodb').Binary,
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
 * Re-Write Mongo's _id attribute to a normalized id attribute in single document
 *
 * @param {Object} models
 * @api private
 */

exports._rewriteIds = function(model, schema) {
  if (hop.call(model, '_id')) {
    // change id to string only if it's necessary
    if (typeof model._id === 'object')
      model.id = model._id.toString();
    else
      model.id = model._id;
    delete model._id;
  }

  // Rewrite any foreign keys if a schema is available
  if (!schema) return model;

  Object.keys(schema).forEach(function (key) {
    var foreignKey = schema[key].foreignKey || false;

    // If a foreignKey, check if value matches a mongo id and if so turn it into an objectId
    if (foreignKey && model[key] instanceof ObjectId) {
      model[key] = model[key].toString();
    }
  });

  return model;
};

/**
 * Re-Write Mongo's _id attribute to a normalized id attribute
 *
 * @param {Array} models
 * @api public
 */

exports.rewriteIds = function rewriteIds(models, schema) {
  var _models = models.map(function(model){
    return exports._rewriteIds(model, schema);
  });
  return _models;
};

/**
 * Normalize documents retrieved from MongoDB to match Waterline's expectations
 *
 * @param {Array} models
 * @api public
 */

exports.normalizeResults = function normalizeResults(models, schema) {
  var _models = models.map(function (model) {
    var _model = exports._rewriteIds(model, schema);
    Object.keys(_model).forEach(function (key) {
      if (model[key] instanceof MongoBinary && _.has(_model[key], 'buffer')) {
        _model[key] = _model[key].buffer;
      }
    });
    return _model;
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

/**
 * Return a WLValidationError if the provided error was
 * caused by a unique constraint violation; otherwise,
 * return the existing error
 *
 * @param {Error} err
 * @return {Error}
 * @api public
 */

exports.clarifyError = function clarifyError(err) {
  // MongoDB duplicate key error code
  if(err.code !== 11000) {
    return err;
  }

  // Example errmsg: `E11000 duplicate key error index: db_name.model_name.$attribute_name_1 dup key: { : "value" }`
  var matches = /E11000 duplicate key error index: .*?\..*?\.\$(.*?)_\d+\s+dup key: { : (.*) }$/.exec(err.errmsg);
  if (!matches) {
    // We cannot parse error message, return original error
    return err;
  }
  var fieldName = matches[1]; // name of index (without _[digits] at the end)
  var value;
  try {
    value = JSON.parse(matches[2]); // attempt to convert the value to a primitive representation
  } catch (x) {
    value = matches[2]; // for non-serializable objects (e.g. ObjectId representations), return as-is
  }

  var validationError = {
    code: 'E_UNIQUE',
    invalidAttributes: {},
    originalError: err
  };

  validationError.invalidAttributes[fieldName] = [
    {
      rule: 'unique',
      value: value
    }
  ];

  return validationError;
};
