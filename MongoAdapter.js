/*---------------------------------------------------------------
  :: sails-mongo
  -> adapter
---------------------------------------------------------------*/

var async = require('async')
, _       = require('underscore')
, _str    = require('underscore.string');

var mongo = require('mongodb')
, Db      = mongo.Db
, Server  = mongo.Server
, Connection  = mongo.Connection
, db      = null;

module.exports = (function(){

  var adapter = {

    syncable: false,

    registerCollection: function(collection, cb) {
      //Connect to MongoDB
      connect(collection, cb);
    },

    drop: function(collectionName, cb) {
      //Open the connection
      db.open(function connectionOpened(err, client){
        if (err) return cb(err);

        // Run query
        db.collection(collectionName, function collectionSelected(err, collection){
          if (err) return cb(err);

          //Drop the collection
          collection.drop(function dropCompleted(err, res){
            if (err) return cb(err);

            //Close the connection
            db.close();
            cb(err,res);
          });
        });
      });
    },

    create: function(collectionName, data, cb) {
      //Open the connection
      db.open(function connectionOpened(err, client){
        if (err) return cb(err);

        // Run query
        db.collection(collectionName, function collectionSelected(err, collection){
          if (err) return cb(err);

          //Count the docs
          collection.find({}, function (err, cursor){
            if (err) return cb(err);

            //Create an array of the result
            cursor.toArray(function(err, items){
              if (err) return cb(err);

              // Set the 'id'
              data.id = items.length + 1;

              // Run query
              collection.insert(data, function insertCompleted(err, res){
                if (err) return cb(err);

                //Close the connection
                db.close();
                cb(err, data);
              });
            });
          });
        });
      });
    },

    find: function(collectionName, options, cb) {
      //Open the connection
      db.open(function connectionOpened(err, client){
        if (err) return cb(err);

        //Select the collection
        db.collection(collectionName, function collectionSelected(err, collection){
          if (err) return cb(err);

          //Find matching documents
          collection.find(options.where, function(err, cursor){
            if (err) return cb(err);

            //Create an array of the result
            cursor.toArray(function (err, res){
              if (err) return cb(err);

              //Close the connection
              db.close();
              cb(err,res);
            });
          });
        });
      });
    },

    update: function(collectionName, options, values, cb) {
      //Open the connection
      db.open(function connectionOpened(err, client){
        if (err) return cb(err);

        //Select the collection
        db.collection(collectionName, function collectionSelected(err, collection){
          if (err) return cb(err);

          //Create query
          var query = { '$set': values };

          //Update matching documents
          collection.update(options.where, query, function(err, res){
            if (err) return cb(err);

            //Find documents matching the results
            collection.find(options.where, function(err, cursor){
              if (err) return cb(err);

              //Create an array of the result
              cursor.toArray(function (err, res){
                if (err) return cb(err);

                //Close the connection
                db.close();
                cb(err,res);
              });
            });
          });
        });
      });
    },

    destroy: function(collectionName, options, cb) {
      //Open the connection
      db.open(function connectionOpened(err, client){
        if (err) return cb(err);

        //Select the collection
        db.collection(collectionName, function collectionSelected(err, collection){
          if (err) return cb(err);

          //Remove matching documents
          collection.remove(options.where, function(err, res){
            if (err) return cb(err);

            //Close the connection
            db.close();
            cb(err,res);
          });
        });
      });
    },

    identity: 'sails-mongo'

  };

  //////////////                 //////////////////////////////////////////
  ////////////// Private Methods //////////////////////////////////////////
  //////////////                 //////////////////////////////////////////
  function connect (collection, cb) {
    db = new Db(collection.database, new Server(collection.host, collection.port || 27017, {}), {w: 1});
    return cb();
  }

  return adapter;

})();