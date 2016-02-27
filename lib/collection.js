
//   ██████╗ ██████╗ ██╗     ██╗     ███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔════╝██╔═══██╗██║     ██║     ██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║     ██║   ██║██║     ██║     █████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║
//  ██║     ██║   ██║██║     ██║     ██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║
//  ╚██████╗╚██████╔╝███████╗███████╗███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
//   ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//
// Manages a MongoDB collection. This is roughly equivelent to the Mongo Shell.

var _ = require('lodash');
var async = require('async');
var QueryConverter = require('machinepack-waterline-query-converter');
var Mongo = require('machinepack-mongodb');
var utils = require('./utils');
var Document = require('./document');

var Collection = module.exports = function Collection(definition, connection) {
  // Set an identity for this collection
  this.identity = '';

  // Hold Schema Information
  this.schema = null;

  // Hold a reference to an active connection
  this.connection = connection;

  // Hold the config object
  var connectionConfig = connection.config || {};
  this.config = _.extend({}, connectionConfig.wlNext);

  // Hold Indexes
  this.indexes = [];

  // Parse the definition into collection attributes
  this._parseDefinition(definition);

  // Build an indexes dictionary
  this._buildIndexes();

  return this;
};


//  ╔═╗╦╔╗╔╔╦╗  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
//  ╠╣ ║║║║ ║║   ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
//  ╚  ╩╝╚╝═╩╝  ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
//
Collection.prototype.find = function find(criteria, cb) {
  var self = this;

  // Normalize the criteria object
  criteria = utils.normalizeCriteria(criteria);

  var query = {
    model: this.identity,
    method: 'find',
    criteria: criteria,
    values: {}
  };

  this._buildAndRun([query], function buildAndRun(err, results) {
    if (err) {
      return cb(err);
    }

    // Build up documents from the results
    var docs = _.map(results[0], function buildDoc(doc) {
      return new Document(doc, self.schema).values;
    });

    // Normalize the query results
    var queryResults = utils.normalizeResults(docs, self.schema);

    cb(err, queryResults);
  });
};


//  ╔═╗╔╦╗╦═╗╔═╗╔═╗╔╦╗  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
//  ╚═╗ ║ ╠╦╝║╣ ╠═╣║║║   ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
//  ╚═╝ ╩ ╩╚═╚═╝╩ ╩╩ ╩  ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
//
Collection.prototype.stream = function find(criteria, stream) {
  stream.end(new Error('NOT IMPLEMENTED'));
};


//  ╦╔╗╔╔═╗╔═╗╦═╗╔╦╗  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
//  ║║║║╚═╗║╣ ╠╦╝ ║    ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
//  ╩╝╚╝╚═╝╚═╝╩╚═ ╩   ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
//
// Runs an INSERT query and then FIND to get the documents that were inserted.
Collection.prototype.insert = function insert(values, cb) {
  var self = this;
  var queries = [];

  // Ensure each document has an objectId
  if (!_.isArray(values)) {
    values = [values];
  }

  var docs = _.map(values, function buildDoc(doc) {
    return new Document(doc, self.schema).values;
  });

  var insertQueries = _.map(docs, function buildQueries(doc) {
    return {
      model: self.identity,
      method: 'create',
      values: doc
    };
  });

  var findQueryIds = _.map(insertQueries, function buildFindQueries(doc) {
    return doc.values._id;
  });


  var findQuery = {
    model: this.identity,
    method: 'find',
    criteria: {
      where: {
        _id: findQueryIds[0]
      }
    }
  };

  // Combine the insert queries with the find query
  queries = _.concat(insertQueries, [findQuery]);

  this._buildAndRun(queries, function buildAndRun(err, result) {
    if (err) {
      return cb(err);
    }

    // Build up documents from the results
    var docs = _.map(result[insertQueries.length], function buildDoc(doc) {
      return new Document(doc, self.schema).values;
    });

    // Normalize the query results
    var queryResults = utils.normalizeResults(docs, self.schema);

    cb(err, queryResults);
  });
};


//  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
//  ║ ║╠═╝ ║║╠═╣ ║ ║╣    ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
//  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝  ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
//
// Runs an UPDATE query and the a FIND query to get the documents updated.
Collection.prototype.update = function update(criteria, values, cb) {
  var self = this;
  var queries = [];

  // Normalize the criteria object
  criteria = utils.normalizeCriteria(criteria);

  // Ensure each document has an objectId
  if (!_.isArray(values)) {
    values = [values];
  }

  var docs = _.map(values, function buildDoc(doc) {
    var _doc = new Document(doc, self.schema).values;

    // Mongo doesn't allow ID's to be updated
    if (_doc.id) {
      delete _doc.id;
    }

    if (_doc._id) {
      delete _doc._id;
    }

    return _doc;
  });

  // Build a find query that returns the id's of the records being updated
  var findQuery = {
    model: self.identity,
    method: 'find',
    criteria: _.extend({}, { select: '_id' }, criteria)
  };

  // Build the update queries
  var updateQueries = _.map(docs, function buildQueries(doc) {
    return {
      model: self.identity,
      method: 'update',
      criteria: criteria,
      values: doc
    };
  });

  // Combine the update queries with the find query
  queries = _.concat([findQuery], updateQueries);

  this._buildAndRun(queries, function buildAndRun(err, result) {
    if (err) {
      return cb(err);
    }

    // Now that all the records have been updated, find and return the values
    var findWhere = _.map(result[0], function collectIds(doc) {
      return doc._id;
    });

    var criteria = {
      model: self.identity,
      method: 'find',
      criteria: {
        where: {
          _id: findWhere
        }
      }
    };

    self._buildAndRun([criteria], function buildAndRun(err, results) {
      if (err) {
        return cb(err);
      }

      // Build up documents from the results
      var docs = _.map(results[0], function buildDoc(doc) {
        return new Document(doc, self.schema).values;
      });

      // Normalize the query results
      var queryResults = utils.normalizeResults(docs, self.schema);

      cb(err, queryResults);
    });
  });
};


//  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
//   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝   ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
//  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩   ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
//
// Runs a FIND query to get the documents to be destroyed and then runs a
// DESTROY query.
Collection.prototype.destroy = function destroy(criteria, cb) {
  var self = this;
  var queries = [];

  // Normalize the criteria object
  criteria = utils.normalizeCriteria(criteria);

  // Build the destroy query
  var destroyQuery = {
    model: this.identity,
    method: 'destroy',
    criteria: criteria,
    values: {}
  };

  // Build a find query that returns the id's of the records being destroyed
  var findQuery = {
    model: self.identity,
    method: 'find',
    criteria: criteria
  };

  // Combine the destroy query with the find query
  queries = _.concat([findQuery], [destroyQuery]);

  this._buildAndRun(queries, function buildAndRun(err, results) {
    if (err) {
      return cb(err);
    }

    // Build up documents from the results
    var docs = _.map(results[0], function buildDoc(doc) {
      return new Document(doc, self.schema).values;
    });

    // Normalize the query results
    var queryResults = utils.normalizeResults(docs, self.schema);

    cb(err, queryResults);
  });
};


//  ╔═╗╔═╗╦ ╦╔╗╔╔╦╗  ╔╦╗╔═╗╔═╗╦ ╦╔╦╗╔═╗╔╗╔╔╦╗╔═╗
//  ║  ║ ║║ ║║║║ ║    ║║║ ║║  ║ ║║║║║╣ ║║║ ║ ╚═╗
//  ╚═╝╚═╝╚═╝╝╚╝ ╩   ═╩╝╚═╝╚═╝╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝
//
Collection.prototype.count = function count(criteria, cb) {
  // Normalize the criteria object
  criteria = utils.normalizeCriteria(criteria);

  var query = {
    model: this.identity,
    method: 'count',
    criteria: criteria,
    values: {}
  };

  this._buildAndRun([query], function buildAndRun(err, results) {
    if (err) {
      return cb(err);
    }

    var docs = results[0];
    var count = docs[0].count;

    cb(err, count);
  });
};


// =============================================================================
//  ╔═╗╦═╗╦╦  ╦╔═╗╔╦╗╔═╗  ╔╦╗╔═╗╔╦╗╦ ╦╔═╗╔╦╗╔═╗
//  ╠═╝╠╦╝║╚╗╔╝╠═╣ ║ ║╣   ║║║║╣  ║ ╠═╣║ ║ ║║╚═╗
//  ╩  ╩╚═╩ ╚╝ ╩ ╩ ╩ ╚═╝  ╩ ╩╚═╝ ╩ ╩ ╩╚═╝═╩╝╚═╝
// =============================================================================


//  ╔═╗╔═╗╔╦╗  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦ ╦  ╦╔═╔═╗╦ ╦
//  ║ ╦║╣  ║   ╠═╝╠╦╝║║║║╠═╣╠╦╝╚╦╝  ╠╩╗║╣ ╚╦╝
//  ╚═╝╚═╝ ╩   ╩  ╩╚═╩╩ ╩╩ ╩╩╚═ ╩   ╩ ╩╚═╝ ╩
Collection.prototype._getPK = function _getPK() {
  var pk = _.find(this.schema, { primaryKey: true });
  if (!pk) {
    pk = 'id';
  }

  return pk;
};


//  ╔═╗╔═╗╦═╗╔═╗╔═╗  ╔╦╗╔═╗╔═╗╦╔╗╔╦╔╦╗╦╔═╗╔╗╔
//  ╠═╝╠═╣╠╦╝╚═╗║╣    ║║║╣ ╠╣ ║║║║║ ║ ║║ ║║║║
//  ╩  ╩ ╩╩╚═╚═╝╚═╝  ═╩╝╚═╝╚  ╩╝╚╝╩ ╩ ╩╚═╝╝╚╝
Collection.prototype._parseDefinition = function _parseDefinition(definition) {
  var self = this;

  // Hold the Schema
  this.schema = _.cloneDeep(definition.definition);

  if (_.has(this.schema, 'id') && this.schema.id.primaryKey && this.schema.id.type === 'integer') {
    this.schema.id.type = 'objectid';
  }

  _.each(this.schema, function processSchema(val, key) {
    // Remove any Auto-Increment Keys, Mongo currently doesn't handle this well without
    // creating additional collection for keeping track of the increment values
    if (val.autoIncrement) {
      delete self.schema[key].autoIncrement;
    }

    // Replace any foreign key value types with ObjectId
    if (val.foreignKey) {
      self.schema[key].type = 'objectid';
    }
  });

  // Set the identity
  var ident = definition.tableName ? definition.tableName : definition.identity.toLowerCase();
  this.identity = ident;
};


//  ╔╗ ╦ ╦╦╦  ╔╦╗  ╦╔╗╔╔╦╗╦╔═╗╦╔═╗╔═╗
//  ╠╩╗║ ║║║   ║║  ║║║║ ║║║║  ║║╣ ╚═╗
//  ╚═╝╚═╝╩╩═╝═╩╝  ╩╝╚╝═╩╝╩╚═╝╩╚═╝╚═╝
Collection.prototype._buildIndexes = function _buildIndexes() {
  var self = this;

  _.each(this.schema, function buildInidices(val, key) {
    var index = {};
    var options = {};

    // If index key is `id` ignore it because Mongo will automatically handle this
    if (key === 'id') {
      return;
    }

    // Handle Unique Indexes
    if (self.schema[key].unique) {
      // Set the index sort direction, doesn't matter for single key indexes
      index[key] = 1;

      // Set the index options
      options.sparse = true;
      options.unique = true;

      // Store the index in the collection
      self.indexes.push({ index: index, options: options });
      return;
    }

    // Handle non-unique indexes
    if (self.schema[key].index) {
      // Set the index sort direction, doesn't matter for single key indexes
      index[key] = 1;

      // Set the index options
      options.sparse = true;

      // Store the index in the collection
      self.indexes.push({ index: index, options: options });
      return;
    }
  });
};


//  ╔╗ ╦ ╦╦╦  ╔╦╗  ╔═╗╔╗╔╔╦╗  ╦═╗╦ ╦╔╗╔
//  ╠╩╗║ ║║║   ║║  ╠═╣║║║ ║║  ╠╦╝║ ║║║║
//  ╚═╝╚═╝╩╩═╝═╩╝  ╩ ╩╝╚╝═╩╝  ╩╚═╚═╝╝╚╝
//
// Given an array of queries, run them and return an array of collected results.
Collection.prototype._buildAndRun = function _buildAndRun(queries, cb) {
  var self = this;
  var collectedResults = [];

  // Run a function for processing each query
  var processQuery = function processQuery(queryDef, nextQuery) {
    async.auto({

      // Convert the criteria into a WQL query
      convert: function convert(next) {
        QueryConverter.convert({
          model: queryDef.model,
          method: queryDef.method,
          criteria: queryDef.criteria,
          values: queryDef.values
        }).exec({
          error: function error(err) {
            return next(err);
          },
          success: function success(query) {
            return next(null, query);
          }
        });
      },

      // Compile the WQL query into a mongo query
      compile: ['convert', function compile(next, results) {
        var query = results.convert;
        Mongo.compileStatement({
          statement: query
        }).exec({
          error: function error(err) {
            return next(err);
          },
          success: function success(statement) {
            return next(null, statement);
          }
        });
      }],

      // Run the compiled query
      runQuery: ['compile', function runQuery(next, results) {
        var query = results.compile;

        Mongo.sendNativeQuery({
          connection: self.connection.db.connection,
          nativeQuery: query.nativeQuery
        }).exec({
          error: function error(err) {
            // Parse the native query error to try and normalize it
            Mongo.parseNativeQueryError({
              queryType: queryDef.method,
              nativeQueryError: err
            }).exec({
              error: function error(err) {
                return next(err);
              },
              success: function success(footprint) {
                return next(footprint);
              }
            });
          },
          badConnection: function badConnection(err) {
            return next(err);
          },
          success: function success(queryResults) {
            return next(null, queryResults.result);
          }
        });
      }]
    },
    function queryCallback(err, results) {
      if (err) {
        return nextQuery(err);
      }

      collectedResults.push(results.runQuery);
      nextQuery();
    });
  };

  async.each(queries, processQuery, function runQueriesCallback(err) {
    if (err) {
      return cb(err);
    }

    cb(null, collectedResults);
  });
};
