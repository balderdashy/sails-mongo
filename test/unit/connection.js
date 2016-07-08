var Connection = require('../../lib/connection'),
  Config = require('../support/config'),
  mongodb = require('mongodb'),
  assert = require('assert'),
  _ = require('lodash'),
  MongoClient = mongodb.MongoClient;

describe('connection', function () {
    describe('when mongo connection object is passed', function () {
        var expectedDbConnection;

        before(function (done) {
            var connectionString = [
                'mongodb://',
                Config.host,
                ':' + Config.port,
                '/' + Config.database
            ].join('');

            MongoClient.connect(connectionString, function (err, db) {
                expectedDbConnection = db;
                done(err);
            });
        });

        after(function () {
            return expectedDbConnection.close();
        });

        it('should use the passed mongo connection object', function (done) {
            var passedConfig = _.extend({}, Config);
            passedConfig.db = expectedDbConnection;

            new Connection(passedConfig, function (_err, db) {
                assert(db.db === expectedDbConnection);
                done(_err);
            });
        });
    });
});
