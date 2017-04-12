var createManager = require('machine').build(require('../../').createManager);
var destroyManager = require('machine').build(require('../../').destroyManager);

describe('Connectable ::', function() {
  describe('Destroy Manager', function() {
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


    it('should successfully destroy the manager', function(done) {
      destroyManager({
        manager: manager
      })
      .exec(function(err) {
        if (err) { return done(err); }
        return done();
      });
    });
  });
});
