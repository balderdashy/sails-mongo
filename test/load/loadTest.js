var assert = require('assert');
var async = require('async');
var Adapter = require('../../lib/adapter');
var Config = require('../support/config');
var Fixture = require('../support/fixture');

var CONNECTIONS = 10000;

describe('Load Testing', function() {
  this.timeout(60000);

  before(function(done) {
    var Schema;

    // Register The Collection
    Adapter.registerCollection({ identity: 'test', config: Config }, function(err) {
      if(err) { return done(err); }

      // Define The Collection
      Adapter.define('test', Fixture, function(err, schema) {
        if(err) { return done(err); }
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
        try {
          assert(!err,err);
          assert(users.length === CONNECTIONS, 'expected '+CONNECTIONS+' users but instead got '+users.length);
        } catch (e) { return done(e); }
        done();
      });
    });
  });

});
