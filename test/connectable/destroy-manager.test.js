const createManager = require('machine').build(require('../../').createManager);
const destroyManager = require('machine').build(require('../../').destroyManager);

describe('Connectable ::', function() {
  describe('Destroy Manager', function() {
    let manager;

    // Create a manager
    before(function(done) {
      // Needed to dynamically get the host using the docker container
      const host = process.env.WATERLINE_ADAPTER_TESTS_HOST || 'localhost';

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
