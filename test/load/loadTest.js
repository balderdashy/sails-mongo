var Adapter = require('../../lib/adapter'),
    Config = require('../support/config'),
    Fixture = require('../support/fixture'),
    assert = require('assert'),
    async = require('async');

var CONNECTIONS = 10000;

describe('Load Testing', function() {
  this.timeout(60000);

  before(function(done) {
    var Schema;

    // Register The Collection
    Adapter.registerCollection({ identity: 'test', config: Config }, function(err) {
      if(err) done(err);

      // Define The Collection
      Adapter.define('test', Fixture, function(err, schema) {
        if(err) return done(err);
        Schema = schema;
        done();
      });
    });
  });

  describe('create with x connection', function() {

    it('should not error', function(done) {

      // generate x users
      async.times(CONNECTIONS, function(n, next){

        var data = {
          first_name: Math.floor((Math.random()*100000)+1),
          last_name: Math.floor((Math.random()*100000)+1),
          email: Math.floor((Math.random()*100000)+1)
        };

        Adapter.create('test', data, next);
      }, function(err, users) {
        assert(!err);
        assert(users.length === CONNECTIONS);
        done();
      });
    });
  });

});
