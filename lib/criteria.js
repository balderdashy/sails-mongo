var _ = require('underscore'),
    ObjectId = require('mongodb').ObjectID,
    utils = require('./utils');

module.exports = {

  parseFindOptions: function(options) {
    return [options.where, _.omit(options, 'where')];
  },

  rewriteCriteria: function(options) {
    if (options.where) {
      if (options.where.id && !options.where._id) {
        options.where['_id'] = _.clone(options.where.id);
        delete options.where.id;
      }

      if (options.where['_id'] && _.isString(options.where['_id'])) {
        options.where['_id'] = new ObjectId(options.where['_id']);
      }

      options.where = this.parseTypes(options.where);
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

  parseTypes: function(obj) {
    var self = this;

    // Rewrite false and true if they come through. Not sure if there
    // is a better way to do this or not.
    _.each(obj, function(val, key) {
      if (val === "false")
        obj[key] = false;
      else if (val === "true")
        obj[key] = true;
      else if (_.isNumber(val))
        obj[key] = obj[key];
      else if (!_.isNaN(Date.parse(val)))
        obj[key] = new Date(val);
      else if (key == 'or') {
        obj['$or'] = val;
        delete obj[key];
      }
      else if (_.isArray(val))
        obj[key] = { '$in': val };
      else if (_.isObject(val))
        obj[key] = self.parseTypes(val); // Nested objects...
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
            if(_.isObject(obj[criteria])) {
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
              original[parent] =  '.*' + val + '.*';
              original[parent] = utils.caseInsensitive(utils.escapeRegex(original[parent]));
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
              original[parent] = val + '.*';
              original[parent] = utils.caseInsensitive(utils.escapeRegex(original[parent]));
              return;
            }

            if(criteria === 'endsWith') {
              val = obj[criteria];
              delete original[parent];
              original[parent] = '.*' + val;
              original[parent] = utils.caseInsensitive(utils.escapeRegex(original[parent]));
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

            // Replace Percent Signs
            if(typeof obj[criteria] === 'string') {
              obj[criteria] = obj[criteria].replace(/%/g, '.*');
            }


            // Ignore special attributes
            if(['_bsontype', '_id', 'id'].indexOf(criteria) < 0) {

              // Wrap in case insensitive regex
              obj[criteria] = utils.caseInsensitive(utils.escapeRegex(obj[criteria]));
            }
          });

          return;
        }

        // Just case insensitive regex a string
        obj[key] = utils.caseInsensitive(utils.escapeRegex(obj[key]));
      };

      // Kick off parsing
      recursiveParse(original);
      query[key] = original;
    });

    return query;
  }

};
