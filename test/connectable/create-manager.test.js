const assert = require('assert');
const createManager = require('machine').build(require('../../').createManager);
const {MongoClient} = require('mongodb');

describe('Connectable ::', () => {
  describe('Create Manager', () => {
    it('should work without a protocol in the connection string', (done) => {
      createManager({
        connectionString: process.env.WATERLINE_ADAPTER_TESTS_URL || 'localhost:27017/mppg'
      })
      .exec((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
    });

    it('should not work with an invalid protocol in the connection string', (done) => {
      createManager({
        connectionString: 'foobar://localhost:27017/mppg'
      })
      .exec((err) => {
        try {
          assert(err, 'Expected error of SOME kind, but didnt get one!');
          assert.equal(err.exit, 'malformed', `Expected it to exit from the \`malformed\` exit!  But it didndt... The error:${err.stack}`);
        } catch (e) { return done(e); }
        return done();
      });
    });


    it('should successfully return a Mongo Server instance', (done) => {
      // Needed to dynamically get the host using the docker container
      const host = process.env.WATERLINE_ADAPTER_TESTS_HOST || 'localhost';

      createManager({
        connectionString: `mongodb://${host}:27017/mppg`
      })
      .exec((err, report) => {
        if (err) {
          return done(err);
        }

        try {
          assert(report.manager);
          assert(report.manager.client instanceof MongoClient);
        } catch (e) { return done(e); }

        return done();
      });
    });
  });
});
