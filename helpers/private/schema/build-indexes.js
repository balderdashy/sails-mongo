//  ██████╗ ██╗   ██╗██╗██╗     ██████╗     ██╗███╗   ██╗██████╗ ███████╗██╗  ██╗███████╗███████╗
//  ██╔══██╗██║   ██║██║██║     ██╔══██╗    ██║████╗  ██║██╔══██╗██╔════╝╚██╗██╔╝██╔════╝██╔════╝
//  ██████╔╝██║   ██║██║██║     ██║  ██║    ██║██╔██╗ ██║██║  ██║█████╗   ╚███╔╝ █████╗  ███████╗
//  ██╔══██╗██║   ██║██║██║     ██║  ██║    ██║██║╚██╗██║██║  ██║██╔══╝   ██╔██╗ ██╔══╝  ╚════██║
//  ██████╔╝╚██████╔╝██║███████╗██████╔╝    ██║██║ ╚████║██████╔╝███████╗██╔╝ ██╗███████╗███████║
//  ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝     ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝
//
// Build database indexes as needed.

var _ = require('@sailshq/lodash');
var async = require('async');
var escapeTableName = require('./escape-table-name');
var runNativeQuery = require('../query/run-native-query');


module.exports = function buildIndexes(options, cb) {
  //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │ │├─┘ │ ││ ││││└─┐
  //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘┴   ┴ ┴└─┘┘└┘└─┘
  if (_.isUndefined(options) || !_.isPlainObject(options)) {
    throw new Error('Invalid options argument. Options must contain: connection, definition, and tableName.');
  }

  if (!_.has(options, 'connection') || !_.isObject(options.connection)) {
    throw new Error('Invalid option used in options argument. Missing or invalid connection.');
  }

  if (!_.has(options, 'definition') || !_.isPlainObject(options.definition)) {
    throw new Error('Invalid option used in options argument. Missing or invalid definition.');
  }

  if (!_.has(options, 'tableName') || !_.isString(options.tableName)) {
    throw new Error('Invalid option used in options argument. Missing or invalid tableName.');
  }


  //  ╔═╗╦╔╗╔╔╦╗  ┌─┐┌┐┌┬ ┬  ┬┌┐┌┌┬┐┌─┐─┐ ┬┌─┐┌─┐
  //  ╠╣ ║║║║ ║║  ├─┤│││└┬┘  ││││ ││├┤ ┌┴┬┘├┤ └─┐
  //  ╚  ╩╝╚╝═╩╝  ┴ ┴┘└┘ ┴   ┴┘└┘─┴┘└─┘┴ └─└─┘└─┘
  var indexes = _.reduce(options.definition, function reduce(meta, val, key) {
    if (_.has(val, 'index')) {
      meta.push(key);
    }

    return meta;
  }, []);


  //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┬┌┐┌┌┬┐┌─┐─┐ ┬┌─┐┌─┐
  //  ╠╩╗║ ║║║   ║║  ││││ ││├┤ ┌┴┬┘├┤ └─┐
  //  ╚═╝╚═╝╩╩═╝═╩╝  ┴┘└┘─┴┘└─┘┴ └─└─┘└─┘
  // Build indexes in series
  async.eachSeries(indexes, function build(name, nextIndex) {
    // Strip slashes from table name, used to namespace index
    var cleanTable = options.tableName.replace(/['"]/g, '');

    // Build a query to create a namespaced index tableName_key
    var query = 'CREATE INDEX ' + escapeTableName(cleanTable + '_' + name) + ' on ' + options.tableName + ' (' + escapeTableName(name) + ');';

    // Run the native query
    runNativeQuery(options.connection, query, nextIndex);
  }, cb);
};
