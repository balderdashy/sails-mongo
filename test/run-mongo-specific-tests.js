var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('waterline');
var waterlineUtils = require('waterline-utils');

describe('dontUseObjectIds', function() {

  var waterline;
  var models = {};

  afterEach(function(done) {
    models = {};
    if (waterline) {
      return waterline.teardown(done);
    }
    return done();
  });

  describe('Without associations', function() {

    beforeEach(function(done) {
      setup(
        [createModel('user', {dontUseObjectIds: true})],
        models,
        done
      );
    });

    describe('Creating a single record', function() {

      it('should create a record w/ a numeric ID', function(done) {

        models.user.create({id: 123, name: 'bob'}).exec(function(err, record) {
          if (err) {return done(err);}
          assert.equal(record.id, 123);
          assert.equal(record.name, 'bob');
          return done();
        });

      });

    });

    describe('Creating multiple records', function() {

      it('should create multiple record w/ a numeric ID', function(done) {

        models.user.createEach([{id: 123, name: 'sid'},{id: 555, name: 'nancy'}]).exec(function(err, records) {
          if (err) {return done(err);}
          assert.equal(records[0].id, 123);
          assert.equal(records[0].name, 'sid');
          assert.equal(records[1].id, 555);
          assert.equal(records[1].name, 'nancy');
          return done();
        });

      });

    });

    describe('Updating a single record', function() {

      it('should update the record correctly', function(done) {
        models.user._adapter.datastores.test.manager.collection('user').insert({_id: 123, name: 'bob'}, function(err, record) {
          if (err) {return done(err);}
          models.user.update({id: 123}, {name: 'joe'}).exec(function(err, records) {
            assert.equal(records[0].id, 123);
            assert.equal(records[0].name, 'joe');
            return done();
          });

        });

      });

    });

    describe('Updating multiple records', function() {

      it('should update the records correctly', function(done) {

        models.user._adapter.datastores.test.manager.collection('user').insert([{_id: 123, name: 'sid'}, {_id: 555, name: 'nancy'}], function(err, record) {
          if (err) {return done(err);}
          models.user.update({id: {'>': 0}}, {name: 'joe'}).exec(function(err, records) {
            if (err) {return done(err);}
            assert.equal(records[0].id, 123);
            assert.equal(records[0].name, 'joe');
            assert.equal(records[1].id, 555);
            assert.equal(records[1].name, 'joe');
            return done();
          });

        });

      });

    });

    describe('Finding a single record', function() {

      it('should find a record w/ a numeric ID', function(done) {

        models.user._adapter.datastores.test.manager.collection('user').insert({_id: 123, name: 'bob'}, function(err, record) {
          models.user.findOne({id: 123}).exec(function(err, record) {
            if (err) {return done(err);}
            assert.equal(record.id, 123);
            assert.equal(record.name, 'bob');
            return done();
          });
        });

      });

    });

    describe('Finding multiple records', function() {

      it('should find the records correctly', function(done) {

        models.user._adapter.datastores.test.manager.collection('user').insert([{_id: 123, name: 'sid'}, {_id: 555, name: 'nancy'}], function(err, record) {
          if (err) {return done(err);}
          models.user.find({id: {'>': 0}}).exec(function(err, records) {
            if (err) {return done(err);}
            assert.equal(records[0].id, 123);
            assert.equal(records[0].name, 'sid');
            assert.equal(records[1].id, 555);
            assert.equal(records[1].name, 'nancy');
            return done();
          });

        });

      });
    });

    describe('Deleting a single record', function() {

      it('should delete the record correctly', function(done) {
        models.user._adapter.datastores.test.manager.collection('user').insert({_id: 123, name: 'bob'}, function(err, record) {
          if (err) {return done(err);}
          models.user.destroy({id: 123}).exec(function(err, records) {
            if (err) {return done(err);}
            models.user._adapter.datastores.test.manager.collection('user').find({}).toArray(function(err, records) {
              if (err) {return done(err);}
              assert.equal(records.length, 0);
              return done();
            });

          });

        });

      });

    });

    describe('Deleting multiple records', function() {

      it('should delete the records correctly', function(done) {

        models.user._adapter.datastores.test.manager.collection('user').insert([{_id: 123, name: 'sid'}, {_id: 555, name: 'nancy'}], function(err, record) {
          if (err) {return done(err);}
          models.user.destroy({id: {'>': 0}}).exec(function(err, records) {
            if (err) {return done(err);}
            models.user._adapter.datastores.test.manager.collection('user').find({}).toArray(function(err, records) {
              if (err) {return done(err);}
              assert.equal(records.length, 0);
              return done();
            });
          });

        });

      });
    });

  });

  describe('With associations', function() {

    describe('Where a single model using ObjectID belongsTo a model using number keys', function() {

    });

    describe('Where a single model using number keys belongsTo a model using ObjectID', function() {

    });

    describe('Where a collection using ObjectID belongsTo a model using number keys ', function() {

    });

    describe('Where a collection using number keys belongsTo a model using ObjectID ', function() {

    });

    describe('Where a collection using ObjectID belongsTo a model using number keys (vialess)', function() {

    });

    describe('Where a collection using number keys belongsTo a model using ObjectID (vialess)', function() {

    });

    describe('Where a collection using ObjectID has many-to-many relationship with a model using number keys', function() {

    });

    describe('Where a collection using number keys has many-to-many relationship with a model using number keys', function() {

    });

  });

  function setup(fixtures, modelsContainer, cb) {

    var defaults = {
      primaryKey: 'id',
      datastore: 'test',
      fetchRecordsOnUpdate: true,
      fetchRecordsOnDestroy: true,
      fetchRecordsOnCreate: true,
      fetchRecordsOnCreateEach: true,
      migrate: 'drop'
    };

    waterline = new Waterline();

    _.each(fixtures, function(val, key) {
      var modelFixture = _.extend({}, defaults, fixtures[key]);
      waterline.registerModel(Waterline.Collection.extend(modelFixture));
    });

    var datastores = {
      test: {
        adapter: 'sails-mongo',
        url: process.env.WATERLINE_ADAPTER_TESTS_URL || 'localhost/sails_mongo'
      }
    };

    // Clear the adapter from memory.
    delete require.cache[require.resolve('../')];

    waterline.initialize({ adapters: { 'sails-mongo': require('../') }, datastores: datastores, defaults: defaults }, function(err, orm) {
      if (err) {
        return cb(err);
      }

      // Save a reference to the ORM
      ORM = orm;

      // Run migrations
      waterlineUtils.autoMigrations('drop', orm, function(err) {
        if (err) {
          return cb(err);
        }

        // Globalize collections for normalization
        _.each(ORM.collections, function(collection, identity) {
          modelsContainer[identity] = collection;
        });
        return cb();
      });
    });

  }

  function createModel (identity, options) {

    var model = {
      datastore: 'test',
      identity: identity,
      attributes: {
        id: { type: 'string', columnName: '_id', autoMigrations: { columnType: 'string', unique: true, autoIncrement: false } },
        name: { type: 'string', autoMigrations: { columnType: 'string', unique: false, autoIncrement: false } }
      }
    };

    if (options.dontUseObjectIds) {
      model.dontUseObjectIds = true;
      model.attributes.id = { type: 'number', columnName: '_id', autoMigrations: { columnType: 'string', unique: true, autoIncrement: false } };
    }

    if (options.toOne) {
      model.attributes.friend = {
        model: options.toOne
      };
    }

    if (options.toMany) {
      model.attributes.friends = {
        collection: options.toMany,
        via: 'friends'
      };
    }

    if (options.toManyVialess) {
      model.attributes.friends = {
        collection: options.toManyVialess
      };
    }

    return model;

  }


});

