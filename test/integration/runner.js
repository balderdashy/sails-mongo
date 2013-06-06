/**
 * Run Integration Tests
 *
 * Uses the waterline-adapter-tests module to
 * run mocha tests against the currently implemented
 * waterline API.
 */

var tests = require('waterline-adapter-tests'),
    adapter = require('../../MongoAdapter'),
    mocha = require('mocha');

/**
 * Build a Postgres Config File
 */

var config = {
  host: 'localhost',
  db: 'sails-mongo',
  port: 27017
};

/**
 * Run Tests
 */

var suite = new tests({ adapter: adapter, config: config });
