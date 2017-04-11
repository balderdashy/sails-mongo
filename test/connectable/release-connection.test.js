var Pack = require('../../');

describe('Connectable ::', function() {
  describe('Release Connection', function() {
    var manager;
    var connection;

    // Create a manager and connection
    before(function(done) {
      // Needed to dynamically get the host using the docker container
      var host = process.env.MONGO_1_PORT_27017_TCP_ADDR || 'localhost';

      Pack.createManager({
        connectionString: 'mongodb://' + host + ':27017/mppg'
      })
      .exec(function(err, report) {
        if (err) {
          return done(err);
        }

        manager = report.manager;

        Pack.getConnection({
          manager: manager
        })
        .exec(function(err, report) {
          if (err) {
            return done(err);
          }

          connection = report.connection;
          return done();
        });
      });
    });

    // The actual machine is a no-op so just ensure no error comes back.
    it('should successfully release a connection', function(done) {
      Pack.releaseConnection({
        connection: connection
      })
      .exec(function(err) {
        if (err) {
          return done(err);
        }

        return done();
      });
    });
  });
});
