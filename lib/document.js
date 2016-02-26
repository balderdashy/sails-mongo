
//  ██████╗  ██████╗  ██████╗██╗   ██╗███╗   ███╗███████╗███╗   ██╗████████╗
//  ██╔══██╗██╔═══██╗██╔════╝██║   ██║████╗ ████║██╔════╝████╗  ██║╚══██╔══╝
//  ██║  ██║██║   ██║██║     ██║   ██║██╔████╔██║█████╗  ██╔██╗ ██║   ██║
//  ██║  ██║██║   ██║██║     ██║   ██║██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║
//  ██████╔╝╚██████╔╝╚██████╗╚██████╔╝██║ ╚═╝ ██║███████╗██║ ╚████║   ██║
//  ╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝
//
// Represents a single document in a collection. Responsible for serializing
// values before writing to a collection.

var _ = require('lodash');
var utils = require('./utils');
var BSON = require('bson');

var Document = module.exports = function Document(values, schema) {
  // Keep track of the current document's values
  this.values = {};

  // Grab the schema for normalizing values
  this.schema = schema || {};

  // If values were passed in, use the setter
  if (values) {
    this.values = this.setValues(values);
  }

  return this;
};


//  ╔═╗╔═╗╔╦╗  ╦  ╦╔═╗╦  ╦ ╦╔═╗╔═╗
//  ╚═╗║╣  ║   ╚╗╔╝╠═╣║  ║ ║║╣ ╚═╗
//  ╚═╝╚═╝ ╩    ╚╝ ╩ ╩╩═╝╚═╝╚═╝╚═╝
//
// Normalizes values into proper formats.
Document.prototype.setValues = function setValues(values) {
  this.serializeValues(values);
  this.normalizeId(values);

  // If there isn't an ID, generate one
  if (!values._id) {
    values._id = new BSON.ObjectID().toHexString();
  }

  return values;
};


//  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗  ╦╔╦╗
//  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   ║ ║║
//  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  ╩═╩╝
//
// Moves values.id into the preferred mongo _id field.
Document.prototype.normalizeId = function normalizeId(values) {
  if (!values.id) {
    return;
  }

  // Check if data.id looks like a MongoID
  if (_.isString(values.id) && values.id.match(/^[a-fA-F0-9]{24}$/)) {
    values._id = new BSON.ObjectID.createFromHexString(values.id);
  } else {
    values._id = values.id;
  }

  delete values.id;
};


//  ╔═╗╔═╗╦═╗╦╔═╗╦  ╦╔═╗╔═╗  ╦  ╦╔═╗╦  ╦ ╦╔═╗╔═╗
//  ╚═╗║╣ ╠╦╝║╠═╣║  ║╔═╝║╣   ╚╗╔╝╠═╣║  ║ ║║╣ ╚═╗
//  ╚═╝╚═╝╩╚═╩╩ ╩╩═╝╩╚═╝╚═╝   ╚╝ ╩ ╩╩═╝╚═╝╚═╝╚═╝
//
Document.prototype.serializeValues = function serializeValues(values) {
  var self = this;

  _.each(values, function serialize(val, key) {
    if (!_.has(self.schema, key)) {
      return;
    }

    var type = self.schema[key].type;
    var foreignKey = self.schema[key].foreignKey || false;

    if (_.isUndefined(val)) {
      return;
    }

    // If a foreignKey, check if value matches a mongo id and if so turn it into an objectId
    if (foreignKey && utils.matchMongoId(val)) {
      values[key] = new BSON.ObjectID.createFromHexString(val);
    }

    if (type === 'json') {
      try {
        val = JSON.parse(values[key]);
      } catch (e) {
        return;
      }
      values[key] = val;
    }
  });

  return values;
};
