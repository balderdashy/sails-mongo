
/**
 * Module Dependencies
 */

var _ = require('lodash'),
    ObjectId = require('mongodb').ObjectID,
    utils = require('./utils'),
    hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Document
 *
 * Represents a single document in a collection. Responsible for serializing values before
 * writing to a collection.
 *
 * @param {Object} values
 * @param {Object} schema
 * @api private
 */

var Document = module.exports = function Document(values, schema) {

  // Keep track of the current document's values
  this.values = {};

  // Grab the schema for normalizing values
  this.schema = schema || {};

  // If values were passed in, use the setter
  if(values) this.values = this.setValues(values);

  return this;
};


/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Set values
 *
 * Normalizes values into proper formats.
 *
 * @param {Object} values
 * @return {Object}
 * @api private
 */

Document.prototype.setValues = function setValues(values) {
  this.serializeValues(values);
  this.normalizeId(values);

  return values;
};

/**
 * Normalize ID's
 *
 * Moves values.id into the preferred mongo _id field.
 *
 * @param {Object} values
 * @api private
 */

Document.prototype.normalizeId = function normalizeId(values) {

  if(!values.id) return;

  // Check if data.id looks like a MongoID
  if(_.isString(values.id) && values.id.match(/^[a-fA-F0-9]{24}$/)) {
    values.id = new ObjectId.createFromHexString(values.id);
  }

  values._id = _.cloneDeep(values.id);
  delete values.id;
};

/**
 * Serialize Insert Values
 *
 * @param {Object} values
 * @return {Object}
 * @api private
 */

Document.prototype.serializeValues = function serializeValues(values) {
  var self = this;

  Object.keys(values).forEach(function(key) {
    if(!hasOwnProperty(self.schema, key)) return;

    var type = self.schema[key].type,
        val;

    var foreignKey = self.schema[key].foreignKey || false;

    var embed = self.schema[key].embed || false;

    var on = self.schema[key].on || 'id';

    // If a foreignKey, check if there is value matching a mongo id and if so turn it into an objectId
    if(foreignKey) {
      // Is it a sub-document or not
      if(!_.isPlainObject(values[key])) {
        // If value is NOT a sub-document, check if value matches a mongo id and
        // if so turn it into an objectId
        if(utils.matchMongoId(values[key])) {
          values[key] = new ObjectId.createFromHexString(values[key]);
        }
      } else {
        // If value is a sub-document and this association is set to embeddable,
        // check if the embedded sub-document has a pk that matches a mongo id
        // and if so turn it into an objectId
        if(embed && values[key] && utils.matchMongoId(values[key][on])) {
          values[key]._id = new ObjectId.createFromHexString(values[key][on]);
          delete values[key].id;
        }
      }
    }

    if(type === 'json') {
      try {
        val = JSON.parse(values[key]);
      } catch(e) {
        return;
      }
      values[key] = val;
    }
  });

  return values;
};
