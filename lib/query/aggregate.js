/**
 * Module dependencies
 */

var Errors = require('waterline-errors').adapter;

/**
 * Aggregate Constructor
 *
 * Generates aggregation objects for use with the Mongo Aggregation pipeline.
 *
 * @param {Object} options
 * @api private
 */

var Aggregate = module.exports = function Aggregate(options) {

  // Hold the criteria
  this.group = {};

  // Build the group phase for an aggregation
  this.build(options);

  return this.group;
};

/**
 * Build
 *
 * Builds up an aggregate query criteria object from a
 * Waterline criteria object.
 *
 * @param {Object} options
 * @api private
 */

Aggregate.prototype.build = function build(options) {
  var self = this,
      aggregateGroup = {},
      aggregations = [];

  // Check if we have calculations to do
  if(!options.sum && !options.average && !options.min && !options.max) {
    throw Errors.InvalidGroupBy;
  }

  // Create the beginnings of the $group aggregation phase
  this.group = { _id: this.groupBy(options) };

  // Build up the group for the $group aggregation phase
  if(Array.isArray(options.sum)) {
    options.sum.forEach(function(opt) {
      self.group[opt] = { '$sum': '$' + opt };
    });
  }

  if(Array.isArray(options.average)) {
    options.average.forEach(function(opt) {
      self.group[opt] = { '$avg': '$' + opt };
    });
  }

  if(Array.isArray(options.min)) {
    options.min.forEach(function(opt) {
      self.group[opt] = { '$min': '$' + opt };
    });
  }

  if(Array.isArray(options.max)) {
    options.max.forEach(function(opt) {
      self.group[opt] = { '$max': '$' + opt };
    });
  }
};

/**
 * Group By
 *
 * Builds up the aggregation _id $group phase.
 *
 * @param {Object} options
 * @api private
 */

Aggregate.prototype.groupBy = function groupBy(options) {
  var group = {};

  if(!options.groupBy) return null;
  if(!Array.isArray(options.groupBy)) return null;

  options.groupBy.forEach(function(key) {
    group[key] = '$' + key;
  });

  return group;
};
