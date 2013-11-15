/**
 * Utility Functions
 */

var _ = require('underscore'), 
  url = require('url');

module.exports = {

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
   */
  caseInsensitive: function(val) {
    if(!_.isString(val)) return val;
    return val.replace(/[-[\]{}()+?*.\/,\\^$|#]/g, "\\$&");
  },

  /**
   * Rewrite ID's
   *
   * Normalizes Mongo's _id to id
   */

  rewriteIds: function (models) {
    return _.map(models, function(model) {
      if (model._id) {

        // change id to string only if it's necessary
        if(typeof model._id === 'object')
          model.id = model._id.toString();
        else
          model.id = model._id;

        delete model._id;
      }
      return model;
    });
  },

  /**
   * Parse URL string from config
   *
   * Parse URL string into connection config parameters
   */
  parseUrl: function (config) {
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
  }

};