const createManager = require('machine').build(require('../../').createManager);
const destroyManager = require('machine').build(require('../../').destroyManager);

describe('Connectable ::', () => {
  describe('Destroy Manager', () => {
    let manager;

    // Create a manager
    before((done) => {
      // Needed to dynamically get the host using the docker container
      const host = process.env.WATERLINE_ADAPTER_TESTS_HOST || 'localhost';

      createManager({
        connectionString: `mongodb://${host}:27017/mppg`
      })
      .exec((err, report) => {
        if (err) {
          return done(err);
        }

        manager = report.manager;
        return done();
      });
    });


    it('should successfully destroy the manager', (done) => {
      destroyManager({
        manager
      })
      .exec((err) => {
        if (err) { return done(err); }
        return done();
      });
    });
  });
});
