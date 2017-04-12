var assert = require('assert');
var createManager = require('machine').build(require('../../').createManager);

describe('Connectable ::', function() {
  describe('Create Manager', function() {
    it('should work without a protocol in the connection string', function(done) {
      createManager({
        connectionString: 'localhost:27017/mppg'
      })
      .exec(function(err) {
        if (err) {
          return done(err);
        }
        return done();
      });
    });

    it('should not work with an invalid protocol in the connection string', function(done) {
      createManager({
        connectionString: 'foobar://localhost:27017/mppg'
      })
      .exec(function(err) {
        try {
          assert(err, 'Expected error of SOME kind, but didnt get one!');
          assert.equal(err.exit, 'malformed', 'Expected it to exit from the `malformed` exit!  But it didndt... The error:'+err.stack);
        } catch (e) { return done(e); }
        return done();
      });
    });


    it('should successfully return a Mongo Server instance', function(done) {
      // Needed to dynamically get the host using the docker container
      var host = process.env.MONGO_1_PORT_27017_TCP_ADDR || 'localhost';

      createManager({
        connectionString: 'mongodb://' + host + ':27017/mppg'
      })
      .exec(function(err, report) {
        if (err) {
          return done(err);
        }

        try {
          assert(report.manager);
        } catch (e) { return done(e); }

        return done();
      });
    });
  });
});
