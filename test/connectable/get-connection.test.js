var assert = require('assert');
var createManager = require('machine').build(require('../../').createManager);
var getConnection = require('machine').build(require('../../').getConnection);

describe('Connectable ::', function() {
  describe('Get Connection', function() {
    var manager;

    // Create a manager
    before(function(done) {
      // Needed to dynamically get the host using the docker container
      var host = process.env.MONGO_1_PORT_27017_TCP_ADDR || 'localhost';

      createManager({
        connectionString: 'mongodb://' + host + ':27017/mppg'
      })
      .exec(function(err, report) {
        if (err) {
          return done(err);
        }

        manager = report.manager;
        return done();
      });
    });

    it('should successfully return a Mongo Server instance', function(done) {
      getConnection({
        manager: manager
      })
      .exec(function(err, report) {
        if (err) {
          return done(err);
        }

        try { assert(report.connection); } catch (e) { return done(e); }

        return done();
      });
    });
  });
});
