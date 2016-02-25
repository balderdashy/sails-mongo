//  ██╗   ██╗████████╗██╗██╗     ██╗████████╗██╗███████╗███████╗
//  ██║   ██║╚══██╔══╝██║██║     ██║╚══██╔══╝██║██╔════╝██╔════╝
//  ██║   ██║   ██║   ██║██║     ██║   ██║   ██║█████╗  ███████╗
//  ██║   ██║   ██║   ██║██║     ██║   ██║   ██║██╔══╝  ╚════██║
//  ╚██████╔╝   ██║   ██║███████╗██║   ██║   ██║███████╗███████║
//   ╚═════╝    ╚═╝   ╚═╝╚══════╝╚═╝   ╚═╝   ╚═╝╚══════╝╚══════╝
//

var _ = require('lodash');
var BSON = require('bson');

var utils = module.exports = {

  //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗  ╦═╗╔═╗╔═╗╦ ╦╦ ╔╦╗╔═╗
  //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   ╠╦╝║╣ ╚═╗║ ║║  ║ ╚═╗
  //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  ╩╚═╚═╝╚═╝╚═╝╩═╝╩ ╚═╝
  //
  // Maps Mongo _id attributes to model.id
  normalizeResults: function normalizeResults(models, schema) {
    return _.map(models, function processModel(model) {
      return utils.normalizeId(model, schema);
    });
  },

  //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗  ╦╔╦╗  ╔═╗╔╦╗╔╦╗╦═╗╦╔╗ ╦ ╦╔╦╗╔═╗
  //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   ║ ║║  ╠═╣ ║  ║ ╠╦╝║╠╩╗║ ║ ║ ║╣
  //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  ╩═╩╝  ╩ ╩ ╩  ╩ ╩╚═╩╚═╝╚═╝ ╩ ╚═╝
  //
  // Converts BSON id's into strings if available.
  normalizeId: function normalizeId(model, schema) {
    if (_.has(model, '_id')) {
      // Check for a BSON id
      if (_.isObject(model._id) && _.has(model._id, '_bsontype')) {
        model.id = new BSON.ObjectID(model._id.id).toString();

        // Otherwise just map _id to id
      } else {
        model.id = model._id;
      }

      // Remove the _id property
      delete model._id;
    }

    // Rewrite any foreign keys if a schema is available
    if (!schema) {
      return model;
    }

    _.each(schema, function mapForeignKeys(val, key) {
      var foreignKey = val.foreignKey || false;

      // If a foreignKey, check if value matches a mongo id and if so turn it
      // into an objectId
      if (foreignKey && _.isObject(val) && _.has(val, '_bsontype')) {
        model[key] = new BSON.ObjectID(val.id).toString();
      }
    });

    return model;
  }

};
