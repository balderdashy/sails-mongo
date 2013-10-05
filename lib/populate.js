
/**
 * Module dependencies
 */

var async = require('async'),
    _ = require('lodash'),
    async = require('async'),
    utils = require('./utils');

/**
 * Find Related Documents
 *
 * @param {Object} connection
 * @param {Array} docs
 * @param {Array} joins
 * @return {Object}
 * @api private
 */

var Populate = module.exports = function Populate(connection, docs, joins) {

  // Cache Parent Docs
  this.docs = docs;

  // Cache Connection
  this.connection = connection;

  // Hold Normalized Joins
  this.joins = [];

  // Hold Related Documents
  this.relatedDocuments = {};

  // Normalize Joins, eliminating needless "joinTable" join sets
  this._normalizeJoins(joins);

  return this;

};


////////////////////////////////////////////////////////////////////////////////////
// PUBLIC METHODS
////////////////////////////////////////////////////////////////////////////////////


/**
 * Find All Related Documents
 *
 * Queries any attributes that should be populated and sets the relatedDocuments.
 *
 * @param {Function} callback
 * @api public
 */

Populate.prototype.getRelatedDocuments = function getRelatedDocuments(cb) {
  var self = this;

  // Run async iteration in the correct context
  function findDocs(item, next) {
    self._findRelatedDocuments.call(self, item, next);
  }

  async.each(this.joins, findDocs, function(err) {
    if(err) return cb(err);

    // Normalize the related documents
    self._normalizeRelatedDocuments();

    cb(null, self.relatedDocuments);
  });

};

/**
 * Build Documents
 *
 * Does an in-memory join of the parent records with the related documents.
 *
 * @param {Function} callback
 * @api public
 */

Populate.prototype.buildDocuments = function buildDocuments(cb) {
  var self = this;

  // Generate Populated Fields before doing an in-memory join
  this._generatePopulatedFields();

  // Run async iteration in the correct context
  function joinDocs(item, next) {
    self._joinRelatedDocuments.call(self, item, next);
  }

  async.each(this.docs, joinDocs, function(err) {
    if(err) return cb(err);
    cb(null, utils.rewriteIds(self.docs));
  });
};


////////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
////////////////////////////////////////////////////////////////////////////////////


/**
 * Normalize Joins
 *
 * Because Mongo doesn't use joinTables but Waterline sends down a generic
 * join set, we need to normalize it so it can be used.
 *
 * @param {Array} joins
 * @api private
 */

Populate.prototype._normalizeJoins = function normalizeJoins(joins) {

  for(var i = 0; i < joins.length; i++) {
    var join = joins[i];

    // If `select` is false this is a virtual joinTable
    if(!join.select) continue;

    // If only a single join is used, this can't be a join table
    if(joins.length === 1) {
      this.joins.push(join);
      continue;
    }

    // Grab the previous join's parent to use
    join.parent = joins[i-1].parent;
    this.joins.push(join);
  }

};

/**
 * Find Related Documents
 *
 * Use the join sets to find documents related to the parent doc.
 *
 * @param {Object} joinSet
 * @param {Function} callback
 * @api private
 */

Populate.prototype._findRelatedDocuments = function findRelatedDocuments(joinSet, cb) {
  var self = this,
      join = _.cloneDeep(joinSet);

  // Normalize ID
  if(join.parentKey === 'id') join.parentKey = '_id';
  if(join.childKey === 'id') join.childKey = '_id';

  // Map the related document id's from the docs found
  var childKeys = this.docs.map(function(doc) {
    return doc[join.parentKey];
  });

  // Flatten the array if a document contains a nested array of documents
  childKeys = _.flatten(childKeys);

  // Grab the collection to query on
  var populateCollection = this.connection.database.collection(join.child);

  // Build WHERE clause for the query
  var where = {};
  where[join.childKey] = { '$in': childKeys };

  // Execute Query to find related documents
  populateCollection.find(where).toArray(function(err, childDocs) {
    if(err) return cb(err);
    self.relatedDocuments[join.child] = childDocs;
    cb();
  });

};

/**
 * Normalize Related Documents ID
 *
 * @api private
 */

Populate.prototype._normalizeRelatedDocuments = function normalizeRelatedDocuments() {
  var self = this;

  Object.keys(this.relatedDocuments).forEach(function(key) {
    self.relatedDocuments[key] = utils.rewriteIds(self.relatedDocuments[key]);
  });

};

/**
 * Generate Populated Fields
 *
 * Creates a normalized array of fields that have been populated and what attributes they
 * were populated on. This is used to do in-memory joins to append related documents to their
 * parent document.
 *
 * @api private
 */

Populate.prototype._generatePopulatedFields = function generatePopulatedFields() {
  var populatedFields;

  populatedFields = this.joins.map(function(join) {
    return {
      parentKey: join.parentKey === 'id' ? '_id' : join.parentKey,
      childKey: join.childKey,
      collection: join.child,
      removeParentKey: join.removeParentKey
    };
  });

  this.populatedFields = Array.isArray(populatedFields) ? populatedFields : [];

};

/**
 * Join Related Documents
 *
 * Appends any documents from the related documents to a parent document where criteria
 * matches a populatedField object.
 *
 * @param {Object} document
 * @param {Function} callback
 * @api private
 */

Populate.prototype._joinRelatedDocuments = function joinRelatedDocuments(document, cb) {
  var self = this,
      append;

  // For each populated field see if a match exists in the related documents
  this.populatedFields.forEach(function(field) {

    // Normalize parent key to an array
    var docIDs = Array.isArray(document[field.parentKey]) ?
      document[field.parentKey].toString() : [document[field.parentKey].toString()];

    // Find any matching related documents
    append = _.filter(self.relatedDocuments[field.collection], function(doc) {
      return docIDs.indexOf(doc[field.childKey].toString()) > -1;
    });

    // Remove the parent's "foreign key" if specified
    if(field.removeParentKey) delete document[field.parentKey];

    // Append the related documents
    document[field.collection] = _.cloneDeep(append);
  });

  cb();

};
