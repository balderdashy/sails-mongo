var _ = require('underscore'),
    ObjectId = require('mongodb').ObjectID,
    utils = require('./utils');

module.exports = {

  parseFindOptions: function(options) {
    return [options.where, _.omit(options, 'where')];
  },

  rewriteCriteria: function(options, schema) {
    if (options.hasOwnProperty('where')) {

      // Fix an issue with broken queries when where is null
      if(options.where === null) {
        options.where = {};
        return options;
      }

      if (options.where.id && !options.where._id) {
        options.where['_id'] = _.clone(options.where.id);
        delete options.where.id;
      }

      if (options.where['_id']) {

        // If we have an array of IDs, attempt to make ObjectIds out of them
        if (_.isArray(options.where['_id'])) {
          options.where['_id'] = _.map(options.where['_id'], function(id) {
            // Before converting to ObjectId, make sure it resembles an object id
            if (_.isString(id) && id.match(/^[a-fA-F0-9]{24}$/)) {
              return new ObjectId(id);
            } else {
              return id;
            }
          });
        }
        // Otherwise if we have a string ID, then before converting to ObjectId, make sure it resembles an object id
        else if (_.isString(options.where['_id']) && options.where['_id'].match(/^[a-fA-F0-9]{24}$/)) {
          options.where['_id'] = new ObjectId(options.where['_id']);
        }
      }

      options.where = this.parseTypes(options.where, schema);
      options = this.normalizeCriteria(options);
    }

    return options;
  },

  // Rewrite values when used with Atomic operators
  rewriteValues: function(values){
    var _values = {};
    var _$set = {};

    _.each(values,function(e,i){
      if(!_.isNaN(i) && i.indexOf("$")===0){
        _values[i] = e;
      }
      else {
        _$set[i]=e;
      }
    });

    if(!_.isEmpty(_$set)){
      _values["$set"] = _$set;
    }

    return _values;
  },

  parseTypes: function(obj, schema) {
    var self = this;

    // Rewrite false and true if they come through. Not sure if there
    // is a better way to do this or not.
    _.each(obj, function(val, key) {

      // TODO: do for all types
      // Parse type based on attibute type.
      // NOTE: MAKE THIS PART OF WATERLINE EVENTUALLY
      if (schema && schema[key] && schema[key].type === 'datetime') {
        if (!_.isNaN(Date.parse(val))) {
          obj[key] = new Date(val);
        }
      }

      else if (val === "false")
        obj[key] = false;
      else if (val === "true")
        obj[key] = true;
      else if (_.isNumber(val))
        obj[key] = obj[key];
      else if (key == 'or') {
        obj['$or'] = val;
        delete obj[key];
      }
      else if (_.isArray(val))
        obj[key] = { '$in': val };
      else if (_.isObject(val))
        obj[key] = self.parseTypes(val, schema && schema[key]); // Nested objects...
    });

    return obj;
  },

  /**
   * Transforms a Waterline Query into a query that can be used
   * with MongoDB. For example it sets '>' to $gt, etc.
   *
   * @param {Object} a waterline criteria query
   * @return {Object} a mongodb criteria query
   */

  normalizeCriteria: function(query) {

    // Loop through each criteria attribute and normalize what it's looking for
    Object.keys(query).forEach(function(key) {
      var original = _.clone(query[key]);

      var parent;

      var recursiveParse = function(obj) {

        // Check if value is an object, if so just grab the first key
        if(_.isObject(obj)) {
          Object.keys(obj).forEach(function(criteria) {
            var val;

            // Recursivly Parse
            if(_.isObject(obj[criteria]) && !(obj[criteria] instanceof Date)) {
              parent = criteria;
              recursiveParse(obj[criteria]);
            }

            // Handle Sorting Order with binary or -1/1 values
            if(key === 'sort') {
              obj[criteria] = ([0, -1].indexOf(obj[criteria]) > -1) ? -1 : 1;
            }

            if(criteria === 'contains') {
              val = obj[criteria];
              delete original[parent];
              val = utils.caseInsensitive(val);
              original[parent] =  '.*' + val + '.*';
              original[parent] = new RegExp('^' + original[parent] + '$', 'i');
              return;
            }

            if(criteria === 'like') {

              if(_.isObject(obj[criteria])) {
                Object.keys(obj[criteria]).forEach(function(key) {
                  original[key] = original[parent][key];
                });

                delete original[parent];
                return;
              }

              // Handle non-objects
              original[parent] = obj[criteria];
              delete original[criteria];

              return;
            }

            if(criteria === 'startsWith') {
              val = obj[criteria];
              delete original[parent];
              val = utils.caseInsensitive(val);
              original[parent] =  val + '.*';
              original[parent] = new RegExp('^' + original[parent] + '$', 'i');
              return;
            }

            if(criteria === 'endsWith') {
              val = obj[criteria];
              delete original[parent];
              val = utils.caseInsensitive(val);
              original[parent] =  '.*' + val;
              original[parent] = new RegExp('^' + original[parent] + '$', 'i');
              return;
            }

            if(criteria === 'lessThan' || criteria === '<') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$lt': val };
              return;
            }

            if(criteria === 'lessThanOrEqual' || criteria === '<=') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$lte': val };
              return;
            }

            if(criteria === 'greaterThan' || criteria === '>') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$gt': val };
              return;
            }

            if(criteria === 'greaterThanOrEqual' || criteria === '>=') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$gte': val };
              return;
            }

            if(criteria.toLowerCase() === 'not' || criteria === '!') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = { '$ne': val };
            }

            // Ignore special attributes
            if(['_bsontype', '_id', 'id'].indexOf(criteria) >= 0) return;

            // Replace Percent Signs
            if(typeof obj[criteria] === 'string') {
              val = utils.caseInsensitive(obj[criteria]);
              val = val.replace(/%/g, '.*');
              obj[criteria] = new RegExp('^' + val + '$', 'i');
            }
          });

          return;
        }

        // Just case insensitive regex a string
        val = utils.caseInsensitive(obj[key]);
        obj[key] = new RegExp('^' + val + '$', 'i');
      };

      // Kick off parsing
      recursiveParse(original);
      query[key] = original;
    });

    return query;
  }

};
