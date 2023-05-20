const assert = require('assert');
const createManager = require('machine').build(require('../../').createManager);
const getConnection = require('machine').build(require('../../').getConnection);

describe('Connectable ::', () => {
  describe('Get Connection', () => {
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

    it('should successfully return a Mongo Server instance', (done) => {
      getConnection({
        manager
      })
      .exec((err, report) => {
        if (err) {
          return done(err);
        }

        try { assert(report.connection); } catch (e) { return done(e); }

        return done();
      });
    });
  });
});
