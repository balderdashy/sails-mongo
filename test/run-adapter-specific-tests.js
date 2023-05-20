const assert = require('assert');
const _ = require('@sailshq/lodash');
const Waterline = require('waterline');
const waterlineUtils = require('waterline-utils');
const normalizeDatastoreConfig = require('../lib/private/normalize-datastore-config');


let waterline;
let models = {};

describe('normalizeDatastoreConfig', () => {

  it('Given a URL without a prefix, normalizeDatastoreConfig should add the prefix', () => {
    const config = {
      url: 'creepygiggles:shipyard4eva@localhost/test'
    };
    normalizeDatastoreConfig(config, undefined, 'mongodb');
    assert.equal(config.url, 'mongodb://creepygiggles:shipyard4eva@localhost/test');
  });

  it('Given a URL with a comma in it (like a Mongo Atlas URL), normalizeDatastoreConfig should not modify the URL.', () => {
    const url = 'mongodb://creepygiggles:shipyard4eva@cluster0-shard-00-00-ienyq.mongodb.net:27017,cluster0-shard-00-01-ienyq.mongodb.net:27017,cluster0-shard-00-02-ienyq.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin';
    const config = {
      url: 'mongodb://creepygiggles:shipyard4eva@cluster0-shard-00-00-ienyq.mongodb.net:27017,cluster0-shard-00-01-ienyq.mongodb.net:27017,cluster0-shard-00-02-ienyq.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin'
    };
    normalizeDatastoreConfig(config);
    assert.equal(url, config.url);
  });

});

describe('aggregations', () => {

  describe('Using `sum`', () => {

    before((done) => {
      setup(
        [createModel('user', {dontUseObjectIds: true})],
        models,
        done
      );
    });

    after((done) => {
      models = {};
      if (waterline) {
        return waterline.teardown(done);
      }
      return done();
    });

    it('should not throw an error if the given critieria don\'t match any records', (done) => {
      models.user.sum('id', {name: 'joe'}).exec((err, sum) => {
        if (err) { return done(err); }
        assert.equal(sum, 0);
        return done();
      });
    });

  });


  describe('Using `avg`', () => {

    before((done) => {
      setup(
        [createModel('user', {dontUseObjectIds: true})],
        models,
        done
      );
    });

    after((done) => {
      models = {};
      if (waterline) {
        return waterline.teardown(done);
      }
      return done();
    });

    it('should not throw an error if the given critieria don\'t match any records', (done) => {
      models.user.avg('id', {name: 'joe'}).exec((err, avg) => {
        if (err) { return done(err); }
        assert.equal(avg, 0);
        return done();
      });
    });

  });

});

describe('dontUseObjectIds', () => {

  describe('Without associations', () => {

    afterEach((done) => {
      models = {};
      if (waterline) {
        return waterline.teardown(done);
      }
      return done();
    });

    beforeEach((done) => {
      setup(
        [createModel('user', {dontUseObjectIds: true})],
        models,
        done
      );
    });

    describe('Creating a single record', () => {

      it('should create a record w/ a numeric ID', (done) => {

        models.user.create({id: 123, name: 'bob'}).exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.id, 123);
          assert.equal(record.name, 'bob');
          return done();
        });

      });

    });

    describe('Creating multiple records', () => {

      it('should create multiple record w/ a numeric ID', (done) => {

        models.user.createEach([{id: 123, name: 'sid'},{id: 555, name: 'nancy'}]).exec((err, records) => {
          if (err) {return done(err);}
          assert.equal(records[0].id, 123);
          assert.equal(records[0].name, 'sid');
          assert.equal(records[1].id, 555);
          assert.equal(records[1].name, 'nancy');
          return done();
        });

      });

    });

    describe('Updating a single record', () => {

      it('should update the record correctly', (done) => {
        models.user._adapter.datastores.test.manager.collection('user').insertOne({_id: 123, name: 'bob'}, (err) => {
          if (err) {return done(err);}
          models.user.updateOne({id: 123}, {name: 'joe'}).exec((err, record) => {
            if (err) {return done(err);}
            assert.equal(record.id, 123);
            assert.equal(record.name, 'joe');
            return done();
          });

        });

      });

    });

    describe('Updating multiple records', () => {

      it('should update the records correctly', (done) => {

        models.user._adapter.datastores.test.manager.collection('user').insertMany([{_id: 123, name: 'sid'}, {_id: 555, name: 'nancy'}], (err) => {
          if (err) {return done(err);}
          models.user.update({id: {'>': 0}}, {name: 'joe'}).exec((err, records) => {
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

    describe('Finding a single record', () => {

      it('should find a record w/ a numeric ID', (done) => {

        models.user._adapter.datastores.test.manager.collection('user').insertOne({_id: 123, name: 'bob'}, (err) => {
          if (err) {return done(err);}
          models.user.findOne({id: 123}).exec((err, record) => {
            if (err) {return done(err);}
            assert.equal(record.id, 123);
            assert.equal(record.name, 'bob');
            return done();
          });
        });

      });

    });

    describe('Finding multiple records', () => {

      it('should find the records correctly', (done) => {

        models.user._adapter.datastores.test.manager.collection('user').insertMany([{_id: 123, name: 'sid'}, {_id: 555, name: 'nancy'}], (err) => {
          if (err) {return done(err);}
          models.user.find({id: {'>': 0}}).exec((err, records) => {
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

    describe('Deleting a single record', () => {

      it('should delete the record correctly', (done) => {
        models.user._adapter.datastores.test.manager.collection('user').insertOne({_id: 123, name: 'bob'}, (err) => {
          if (err) {return done(err);}
          models.user.destroy({id: 123}).exec((err) => {
            if (err) {return done(err);}
            models.user._adapter.datastores.test.manager.collection('user').find({}).toArray((err, records) => {
              if (err) {return done(err);}
              assert.equal(records.length, 0);
              return done();
            });

          });

        });

      });

    });

    describe('Deleting multiple records', () => {

      it('should delete the records correctly', (done) => {

        models.user._adapter.datastores.test.manager.collection('user').insertMany([{_id: 123, name: 'sid'}, {_id: 555, name: 'nancy'}], (err) => {
          if (err) {return done(err);}
          models.user.destroy({id: {'>': 0}}).exec((err) => {
            if (err) {return done(err);}
            models.user._adapter.datastores.test.manager.collection('user').find({}).toArray((err, records) => {
              if (err) {return done(err);}
              assert.equal(records.length, 0);
              return done();
            });
          });

        });

      });
    });

  });

  describe('With associations', () => {

    describe('Where a single model using number keys belongsTo a model using ObjectID', () => {

      before((done) => {
        setup(
          [createModel('user', {toOne: 'pet'}), createModel('pet', {dontUseObjectIds: true})],
          models,
          done
        );
      });

      after((done) => {
        models = {};
        if (waterline) {
          return waterline.teardown(done);
        }
        return done();
      });

      it('Should be able to create and retrieve the association successfully', (done) => {

        models.pet.create({id: 123, name: 'alice'}).exec((err) => {
          if (err) {return done(err);}
          models.user.create({name: 'scott', friend: 123}).exec((err, user) => {
            if (err) {return done(err);}
            models.user.findOne({id: user.id}).populate('friend').exec((err, record) => {
              if (err) {return done(err);}
              assert.equal(record.name, 'scott');
              assert(record.friend);
              assert.equal(record.friend.id, 123);
              assert.equal(record.friend.name, 'alice');
              return done();
            });
          });
        });

      });

    });


    describe('Where a single model using ObjectID belongsTo a model using number keys', () => {

      before((done) => {
        setup(
          [createModel('user', {toOne: 'pet', dontUseObjectIds: true}), createModel('pet')],
          models,
          done
        );
      });

      after((done) => {
        models = {};
        if (waterline) {
          return waterline.teardown(done);
        }
        return done();
      });

      it('Should be able to create and retrieve the association successfully', (done) => {

        models.pet.create({name: 'alice'}).exec((err, pet) => {
          if (err) {return done(err);}
          models.user.create({id: 123, name: 'scott', friend: pet.id}).exec((err, user) => {
            if (err) {return done(err);}
            models.user.findOne({id: user.id}).populate('friend').exec((err, record) => {
              if (err) {return done(err);}
              assert.equal(record.name, 'scott');
              assert(record.friend);
              assert.equal(record.friend.id, pet.id);
              assert.equal(record.friend.name, 'alice');
              return done();
            });
          });
        });

      });
    });

    describe('Where a collection using number keys belongsTo a model using ObjectID ', () => {

      let userId;

      before((done) => {
        setup(
          [createModel('user', {oneToMany: 'pet'}), createModel('pet', {toOne: 'user', dontUseObjectIds: true})],
          models,
          (err) => {
            if (err) {return done(err);}
            models.pet.create({id: 123, name: 'alice'}).exec((err) => {
              if (err) {return done(err);}
              models.user.create({name: 'scott', friends: [123]}).exec((err, user) => {
                if (err) {return done(err);}
                userId = user.id;
                return done();
              });
            });
          }
        );
      });

      after((done) => {
        models = {};
        if (waterline) {
          return waterline.teardown(done);
        }
        return done();
      });

      it('Should be able to create and retrieve the association successfully from the "hasMany" side', (done) => {

        models.user.findOne({id: userId}).populate('friends').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'scott');
          assert(record.friends);
          assert.equal(record.friends.length, 1);
          assert.equal(record.friends[0].id, 123);
          assert.equal(record.friends[0].name, 'alice');
          return done();
        });

      });

      it('Should be able to create and retrieve the association successfully from the "hasOne" side', (done) => {

        models.pet.findOne({id: 123}).populate('friend').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'alice');
          assert(record.friend);
          assert.equal(record.friend.id, userId);
          assert.equal(record.friend.name, 'scott');
          return done();
        });

      });


    });

    describe('Where a collection using ObjectID belongsTo a model using number keys', () => {

      let petId;

      before((done) => {
        setup(
          [createModel('user', {oneToMany: 'pet', dontUseObjectIds: true}), createModel('pet', {toOne: 'user'})],
          models,
          (err) => {
            if (err) {return done(err);}
            models.pet.create({name: 'alice'}).exec((err, pet) => {
              if (err) {return done(err);}
              petId = pet.id;
              models.user.create({id: 123, name: 'scott', friends: [pet.id]}).exec((err) => {
                if (err) {return done(err);}
                return done();
              });
            });
          }
        );
      });

      after((done) => {
        models = {};
        if (waterline) {
          return waterline.teardown(done);
        }
        return done();
      });

      it('Should be able to create and retrieve the association successfully from the "hasMany" side', (done) => {

        models.user.findOne({id: 123}).populate('friends').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'scott');
          assert(record.friends);
          assert.equal(record.friends.length, 1);
          assert.equal(record.friends[0].id, petId);
          assert.equal(record.friends[0].name, 'alice');
          return done();
        });

      });

      it('Should be able to create and retrieve the association successfully from the "hasOne" side', (done) => {

        models.pet.findOne({id: petId}).populate('friend').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'alice');
          assert(record.friend);
          assert.equal(record.friend.id, 123);
          assert.equal(record.friend.name, 'scott');
          return done();
        });

      });

    });

    describe('Where a collection using number keys belongsTo a model using ObjectID (vialess)', () => {

      let userId;

      before((done) => {
        setup(
          [createModel('user', {toManyVialess: 'pet'}), createModel('pet', {dontUseObjectIds: true})],
          models,
          (err) => {
            if (err) {return done(err);}
            models.pet.create({id: 123, name: 'alice'}).exec((err) => {
              if (err) {return done(err);}
              models.user.create({name: 'scott', friends: [123]}).exec((err, user) => {
                if (err) {return done(err);}
                userId = user.id;
                return done();
              });
            });
          }
        );
      });

      after((done) => {
        models = {};
        if (waterline) {
          return waterline.teardown(done);
        }
        return done();
      });

      it('Should be able to create and retrieve the association successfully from the "hasMany" side', (done) => {

        models.user.findOne({id: userId}).populate('friends').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'scott');
          assert(record.friends);
          assert.equal(record.friends.length, 1);
          assert.equal(record.friends[0].id, 123);
          assert.equal(record.friends[0].name, 'alice');
          return done();
        });

      });

    });

    describe('Where a collection using ObjectID belongsTo a model using number keys (vialess)', () => {

      let petId;
      // eslint-disable-next-line no-unused-vars
      let userId;

      before((done) => {
        setup(
          [createModel('user', {toManyVialess: 'pet', dontUseObjectIds: true}), createModel('pet')],
          models,
          (err) => {
            if (err) {return done(err);}
            models.pet.create({name: 'alice'}).exec((err, pet) => {
              if (err) {return done(err);}
              petId = pet.id;
              models.user.create({id: 123, name: 'scott', friends: [petId]}).exec((err, user) => {
                if (err) {return done(err);}
                userId = user.id;
                return done();
              });
            });
          }
        );
      });

      after((done) => {
        models = {};
        if (waterline) {
          return waterline.teardown(done);
        }
        return done();
      });

      it('Should be able to create and retrieve the association successfully from the "hasMany" side', (done) => {

        models.user.findOne({id: 123}).populate('friends').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'scott');
          assert(record.friends);
          assert.equal(record.friends.length, 1);
          assert.equal(record.friends[0].id, petId);
          assert.equal(record.friends[0].name, 'alice');
          return done();
        });

      });

    });

    describe('Where a collection using ObjectID has many-to-many relationship with a model using number keys', () => {

      let petId;

      before((done) => {
        setup(
          [createModel('user', {manyToMany: 'pet', dontUseObjectIds: true}), createModel('pet', {manyToMany: 'user'})],
          models,
          (err) => {
            if (err) {return done(err);}
            models.pet.create({name: 'alice'}).exec((err, pet) => {
              if (err) {return done(err);}
              petId = pet.id;
              models.user.create({id: 123, name: 'scott', friends: [pet.id]}).exec((err) => {
                if (err) {return done(err);}
                return done();
              });
            });
          }
        );
      });

      after((done) => {
        models = {};
        if (waterline) {
          return waterline.teardown(done);
        }
        return done();
      });

      it('Should be able to create and retrieve the association successfully from the side w/out ObjectID', (done) => {

        models.user.findOne({id: 123}).populate('friends').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'scott');
          assert(record.friends);
          assert.equal(record.friends.length, 1);
          assert.equal(record.friends[0].id, petId);
          assert.equal(record.friends[0].name, 'alice');
          return done();
        });

      });

      it('Should be able to create and retrieve the association successfully from the side w/ ObjectID', (done) => {
        models.pet.findOne({id: petId}).populate('friends').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'alice');
          assert(record.friends);
          assert.equal(record.friends.length, 1);
          assert.equal(record.friends[0].id, 123);
          assert.equal(record.friends[0].name, 'scott');
          return done();
        });

      });

    });

    describe('Where a collection using number keys has many-to-many relationship with a model using number keys', () => {

      before((done) => {
        setup(
          [createModel('user', {manyToMany: 'pet', dontUseObjectIds: true}), createModel('pet', {manyToMany: 'user', dontUseObjectIds: true})],
          models,
          (err) => {
            if (err) {return done(err);}
            models.pet.create({id: 555, name: 'alice'}).exec((err) => {
              if (err) {return done(err);}
              models.user.create({id: 123, name: 'scott', friends: [555]}).exec((err) => {
                if (err) {return done(err);}
                return done();
              });
            });
          }
        );
      });

      after((done) => {
        models = {};
        if (waterline) {
          return waterline.teardown(done);
        }
        return done();
      });

      it('Should be able to create and retrieve the association successfully from the first side', (done) => {

        models.user.findOne({id: 123}).populate('friends').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'scott');
          assert(record.friends);
          assert.equal(record.friends.length, 1);
          assert.equal(record.friends[0].id, 555);
          assert.equal(record.friends[0].name, 'alice');
          return done();
        });

      });

      it('Should be able to create and retrieve the association successfully from the second side', (done) => {
        models.pet.findOne({id: 555}).populate('friends').exec((err, record) => {
          if (err) {return done(err);}
          assert.equal(record.name, 'alice');
          assert(record.friends);
          assert.equal(record.friends.length, 1);
          assert.equal(record.friends[0].id, 123);
          assert.equal(record.friends[0].name, 'scott');
          return done();
        });

      });

    });

  });

});

function setup(fixtures, modelsContainer, cb) {

  const defaults = {
    primaryKey: 'id',
    datastore: 'test',
    fetchRecordsOnUpdate: true,
    fetchRecordsOnDestroy: true,
    fetchRecordsOnCreate: true,
    fetchRecordsOnCreateEach: true,
    migrate: 'drop'
  };

  waterline = new Waterline();

  _.each(fixtures, (val, key) => {
    const modelFixture = _.extend({}, defaults, fixtures[key]);
    waterline.registerModel(Waterline.Collection.extend(modelFixture));
  });

  const datastores = {
    test: {
      adapter: 'sails-mongo',
      url: process.env.WATERLINE_ADAPTER_TESTS_URL || 'localhost/sails_mongo'
    }
  };

  // Clear the adapter from memory.
  delete require.cache[require.resolve('../')];

  waterline.initialize({ adapters: { 'sails-mongo': require('../') }, datastores, defaults }, (err, orm) => {
    if (err) {
      return cb(err);
    }

    // Save a reference to the ORM
    const ORM = orm;

    // Run migrations
    waterlineUtils.autoMigrations('drop', orm, (err) => {
      if (err) {
        return cb(err);
      }

      // Globalize collections for normalization
      _.each(ORM.collections, (collection, identity) => {
        modelsContainer[identity] = collection;
      });
      return cb();
    });
  });

}

function createModel(identity, options) {

  options = options || {};

  const model = {
    datastore: 'test',
    identity,
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

  if (options.oneToMany) {
    model.attributes.friends = {
      collection: options.oneToMany,
      via: 'friend'
    };
  }

  if (options.manyToMany) {
    model.attributes.friends = {
      collection: options.manyToMany,
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

