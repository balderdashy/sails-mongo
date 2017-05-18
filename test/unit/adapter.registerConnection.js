var Adapter = require('../../lib/adapter'),
    assert = require('assert');

describe('adapter', function() {

  describe('.registerConnection()', function() {

    it('should allow to register again a connection after a registration error', function(done) {

      var connection = {
        identity: 'registerConnection',
        port: '5555'
      };

      Adapter.registerConnection(connection, {}, function(firstErr, firstColl) {
        assert(firstErr);
        assert(firstErr.originalError);

        Adapter.registerConnection(connection, {}, function(secondErr, secondColl) {
          assert(secondErr);
          assert(secondErr.originalError);

          done();
        });
      });
    });
  });

});
