/**
 * Utility Functions
 */

var _ = require('underscore');

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
    return new RegExp('^' + val + '$', 'i');
  },

  /**
   * Escape Regex
   *
   * Escapes special characters used in a regex.
   * This is needed because we will then wrap it in
   * the above case insensitive regex.
   */
  escapeRegex: function(val) {
    if(!_.isString(val)) return val;
    return val.replace(/[-[\]{}()+?,\\^$|#]/g, "\\$&");
  },

  /**
   * Rewrite ID's
   *
   * Normalizes Mongo's _id to id
   */

  rewriteIds: function (models) {
    return _.map(models, function(model) {
      if (model._id) {
        model.id = model._id;
        delete model._id;
      }
      return model;
    });
  }

};
