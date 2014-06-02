var Query = require('../../../lib/query');
var assert = require('assert');

describe('Query', function () {

  describe('like with null', function () {

    it('should ignore the like clause', function () {
      var options = {
        where: {
          like: null
        }
      };
      var Q = new Query(options, { name: 'string' });
      var criteria = Q.criteria.where;
      assert(criteria.hasOwnProperty('like') === false);
    });

  });

  describe('with null value', function () {

    it('should query as null', function () {
      var options = {
        where: {
          name: null
        }
      };
      var Q = new Query(options, { name: 'string' });
      var criteria = Q.criteria.where;
      assert(criteria.hasOwnProperty('name'));
      assert(criteria['name'] === null);
    });

  });

  describe('with null expression', function () {

    it.only('should ', function () {
      var options = {
        where: {
          name: { like: null }
        }
      };
      var Q = new Query(options, { name: 'string' });
      var criteria = Q.criteria.where;
      assert(criteria.hasOwnProperty('name'));
      assert(criteria['name'].hasOwnProperty('like'));
      assert(criteria['name']['like'] === null);
    });

  });

});