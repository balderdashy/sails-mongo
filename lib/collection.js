
/**
 * Module dependencies
 */

var _ = require('lodash'),
    async = require('async'),
    utils = require('./utils'),
    Connection = require('./connection'),
    Document = require('./document'),
    Query = require('./query'),
    ObjectId = require('mongodb').ObjectID;

/**
 * Manage A Collection
 *
 * @param {Object} definition
 */

var Collection = module.exports = function Collection(definition) {

  // Set an identity for this collection
  this.identity = '';

  // Hold Configuration for this collection
  this.config = {};

  // Hold Schema Information
  this.schema = null;

  // Flag as a virtual "join" table or not
  this.joinTable = definition.meta.junctionTable;

  // Hold Indexes
  this.indexes = [];

  // Parse the definition into collection attributes
  this.parseDefinition(definition);

  // Build an indexes dictionary
  this.buildIndexes();

  return this;
};


/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Parse Collection Definition
 *
 * @param {Object} definition
 * @api private
 */

Collection.prototype.parseDefinition = function parseDefinition(definition) {
  var self = this,
      collectionDef = _.cloneDeep(definition);

  // Load the url connection parameters if set
  this.config = utils.parseUrl(collectionDef.config);

  // Hold the Schema
  this.schema = collectionDef.definition;

  // Remove any Auto-Increment Keys, Mongo currently doesn't handle this well without
  // creating additional collection for keeping track of the increment values
  Object.keys(this.schema).forEach(function(key) {
    if(self.schema[key].autoIncrement) delete self.schema[key].autoIncrement;
  });

  // Set the identity
  this.identity = collectionDef.identity.toLowerCase();
};

/**
 * Build Internal Indexes Dictionary based on the current schema.
 *
 * @api private
 */

Collection.prototype.buildIndexes = function buildIndexes() {
  var self = this;

  Object.keys(this.schema).forEach(function(key) {
    var index = {},
        options = {};

    // Handle Unique Indexes
    if(self.schema[key].unique) {

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
    if(self.schema[key].index) {

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


/////////////////////////////////////////////////////////////////////////////////
// PUBLIC METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Find Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */

Collection.prototype.find = function find(criteria, cb) {
  var self = this,
      connection = new Connection(this.config),
      query;

  // Catch errors build query and return to the callback
  try {
    query = new Query(criteria);
  } catch(err) {
    return cb(err);
  }

  connection.open(function() {
    var collection = connection.database.collection(self.identity);

    // Check for aggregate query
    if(query.aggregate) {
      var aggregate = [
        { '$match': query.criteria.where || {} },
        { '$group': query.aggregateGroup }
      ];

      return collection.aggregate(aggregate, function(err, results) {
        connection.database.close(function() {

          // Results have grouped by values under _id, so we extract them
          var mapped = results.map(function(result) {
            for(var key in result._id) {
              result[key] = result._id[key];
            }
            delete result._id;
            return result;
          });

          cb(err, mapped);
        });
      });
    }

    var where = query.criteria.where || {};
    var queryOptions = _.omit(query.criteria, 'where');

    // Run Normal Query on collection
    collection.find(where, queryOptions).toArray(function(err, docs) {

      // Hold all the related documents, arranged by collection name
      var relatedDocuments = {};

      // Hold normalized virtual joins
      var joins = [];

      // Normalize "joins", because Mongo doesn't use joinTables but Waterline sends down a generic
      // join set we need to normalize it so it can be used.
      for(var i=0; i<query.joins.length; i++) {

        var join = query.joins[i];

        // If `select` is false this is a virtual joinTable
        if(!join.select) continue;

        if(query.joins.length === 1) {
          joins.push(join);
          continue;
        }

        // Grab the previous join's parent to use
        join.parent = query.joins[i-1].parent;
        joins.push(join);
      }


      // Find related documents when a populate is used in a query
      function findRelatedDocuments(item, nextItem) {
        var join = _.cloneDeep(item);

        // Normalize ID
        if(join.parentKey === 'id') join.parentKey = '_id';
        if(join.childKey === 'id') join.childKey = '_id';

        // Map the related document id's from the docs found
        var childKeys = docs.map(function(doc) {
          return doc[join.parentKey];
        });

        // Flatten the array
        childKeys = _.flatten(childKeys);

        // Grab the collection to query on
        var populateCollection = connection.database.collection(join.child);

        // Build WHERE clause for the query
        var where = {};
        where[join.childKey] = { '$in': childKeys };

        // Execute Query to find related documents
        populateCollection.find(where).toArray(function(err, childDocs) {
          if(err) return nextItem(err);
          relatedDocuments[join.child] = childDocs;
          nextItem();
        });
      }

      async.each(joins, findRelatedDocuments, function(err) {

        // Close the database connection, it's no longer needed
        connection.database.close(function() {
          if(err) return cb(err);

          //////////////////////////////////////////////////
          // In-Memory Join of related documents
          //////////////////////////////////////////////////

          // Re-write related documents ID's
          Object.keys(relatedDocuments).forEach(function(key) {
            relatedDocuments[key] = utils.rewriteIds(relatedDocuments[key]);
          });

          // Build up an array of populated fields to append related documents
          var populatedFields = joins.map(function(join) {

            return {
              parentKey: join.parentKey === 'id' ? '_id' : join.parentKey,
              childKey: join.childKey,
              collection: join.child,
              removeParentKey: join.removeParentKey
            };
          });

          // Do In-Memory joins on each document to append related documents
          function inMemoryJoin(item, nextItem) {

            // For Each populated field see if a match exists in the related documents
            populatedFields.forEach(function(field) {

              // Normalize parent key to an array
              var docIDs = Array.isArray(item[field.parentKey]) ? item[field.parentKey].toString() : [item[field.parentKey].toString()];

              var append = _.filter(relatedDocuments[field.collection], function(doc) {
                return docIDs.indexOf(doc[field.childKey].toString()) > -1;
              });

              if(field.removeParentKey) delete item[field.parentKey];
              item[field.collection] = _.cloneDeep(append);
            });

            nextItem();
          }

          async.each(docs, inMemoryJoin, function(err) {
            if(err) return cb(err);
            cb(null, utils.rewriteIds(docs));
          });
        });
      });
    });
  });
};

/**
 * Insert A New Document
 *
 * @param {Object|Array} values
 * @param {Function} callback
 * @api public
 */

Collection.prototype.insert = function insert(values, cb) {
  var self = this,
      connection = new Connection(this.config),
      opts = [],
      results = [],
      docs,
      attributeName;

  // Normalize values to an array
  if(!_.isArray(values)) values = [values];

  // Build a Document and add the values to a new array
  docs = values.map(function(value) {
    return new Document(value, self.schema).values;
  });

  connection.open(function() {

    if(!self.joinTable) {
      return connection.database.collection(self.identity).insert(docs, function(err, results) {
        connection.database.close(function() {
          if(err) return cb(err);
          cb(null, utils.rewriteIds(results));
        });
      });
    }

    // If this is a "joinTable" there will be 2 values in each document. We need to append the
    // id's to the corresponding records.
    //
    // Ex: Given a Driver and Taxi collection where each driver can have many taxis and a taxi
    // can have many drivers. The document would look like:
    // { taxi_id: '<id>', driver_id: '<id>' }
    // We need to add the driver_id to the taxi record and the taxi to the driver record.

    docs.forEach(function(item) {
      Object.keys(item).forEach(function(key) {

        // Grab the key/value of the opposite value
        attributeName = Object.keys(_.omit(item, key))[0];

        opts.push({
          collection: self.schema[key].references,
          parent: item[key],
          attributeName: attributeName,
          attributeValue: item[attributeName]
        });
      });
    });

    // Run Each Operation using an $addToSet operation on the parent
    function addReference(item, nextItem) {
      var collection, query, set, options;

      collection = connection.database.collection(item.collection);
      query = { _id: ObjectId(item.parent.toString()) };

      set = {};
      set[item.attributeName] = item.attributeValue;
      options = { '$addToSet': set };

      collection.update(query, options, function(err, result) {
        if(err) return nextItem(err);
        results.push(result);

        nextItem();
      });
    }

    async.each(opts, addReference, function(err) {
      connection.database.close(function() {
        if(err) return cb(err);
        cb(null, utils.rewriteIds(results));
      });
    });
  });
};

/**
 * Update Documents
 *
 * @param {Object} criteria
 * @param {Object} values
 * @param {Function} callback
 */

Collection.prototype.update = function update(criteria, values, cb) {
  var self = this,
      connection = new Connection(this.config),
      query;

  // Catch errors build query and return to the callback
  try {
    query = new Query(criteria);
  } catch(err) {
    return cb(err);
  }

  values = new Document(values, this.schema).values;

  // Mongo doesn't allow ID's to be updated
  if(values.id) delete values.id;
  if(values._id) delete values._id;

  connection.open(function() {
    var collection = connection.database.collection(self.identity);

    // Lookup records being updated and grab their ID's
    // Useful for later looking up the record after an insert
    // Required because options may not contain an ID
    collection.find(query.criteria.where).toArray(function(err, records) {
      if(err || !records) {
        return connection.database.close(function() {
          if(err) return cb(err);
          return cb(new Error('Could not find any records to update'));
        });
      }

      // Build an array of records
      var updatedRecords = [];

      records.forEach(function(record) {
        updatedRecords.push(record._id);
      });

      // Update the records
      collection.update(query.criteria.where, { '$set': values }, { multi: true }, function(err, result) {
        if(err) {
          return connection.database.close(function() {
            cb(err);
          });
        }

        // Look up newly inserted records to return the results of the update
        collection.find({ _id: { '$in': updatedRecords }}).toArray(function(err, records) {
          connection.database.close(function() {
            if(err) return cb(err);
            cb(null, utils.rewriteIds(records));
          });
        });
      });
    });
  });
};

/**
 * Destroy Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 */

Collection.prototype.destroy = function destroy(criteria, cb) {
  var self = this,
      connection = new Connection(this.config),
      opts = [],
      results = [],
      item,
      attributeName,
      query;

  // Catch errors build query and return to the callback
  try {
    query = new Query(criteria);
  } catch(err) {
    return cb(err);
  }

  connection.open(function() {

    if(!self.joinTable) {
      return connection.database.collection(self.identity).remove(query.criteria.where, function(err, results) {
        connection.database.close(function() {
          if(err) return cb(err);

          // Force to array to meet Waterline API
          var resultsArray = [];

          // If result is not an array return an array
          if(!Array.isArray(results)) {
            resultsArray.push({ id: results });
            return cb(null, resultsArray);
          }

          // Create a valid array of IDs
          results.forEach(function(result) {
            resultsArray.push({ id: result });
          });

          cb(null, utils.rewriteIds(resultArray));
        });
      });
    }

    // If this is a "joinTable" there will be 2 values in the criteria. We need to remove the
    // id's from the corresponding records.
    //
    // Ex: Given a Driver and Taxi collection where each driver can have many taxis and a taxi
    // can have many drivers. The document would look like:
    // { taxi_id: '<id>', driver_id: '<id>' }
    // We need to remove the driver_id from the taxi record and the taxi id from the driver record.

    item = criteria.where;

    Object.keys(item).forEach(function(key) {

      // Grab the key/value of the opposite value
      attributeName = Object.keys(_.omit(item, key))[0];

      opts.push({
        collection: self.schema[key].references,
        parent: item[key],
        attributeName: attributeName,
        attributeValue: item[attributeName]
      });
    });

    // Run Each Operation using an $pull operation on the parent
    function removeReference(item, nextItem) {
      var collection, query, set, options;

      collection = connection.database.collection(item.collection);
      query = { _id: ObjectId(item.parent.toString()) };

      set = {};
      set[item.attributeName] = item.attributeValue;
      options = { '$pull': set };

      collection.update(query, options, function(err, result) {
        if(err) return nextItem(err);
        results.push({ id: result });

        nextItem();
      });
    }

    async.each(opts, removeReference, function(err) {
      connection.database.close(function() {
        if(err) return cb(err);
        cb(null, utils.rewriteIds(results));
      });
    });
  });
};
