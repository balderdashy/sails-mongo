var Query = require('../../../lib/query');
var assert = require('assert');
var _ = require('lodash');

describe('Query', function () {
  "use strict";

  describe('against Waterline Query Language (addition cases)', function () {

    describe('with Normal Pair', function () {

      it('should query as null if the value is null', function () {
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

    describe('when like is null', function () {

      it('should consider like as a normal attribute', function () {
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

    describe('with like clause', function () {

      it('should be ignored if it is null', function () {
        var options = {
          where: {
            like: null
          }
        };
        var Q = new Query(options, { name: 'string' });
        var criteria = Q.criteria.where;
        assert(criteria.hasOwnProperty('like') === false);
      });

      it('should consider as a normal object if it is NOT a top level operator', function () {
        var where = {
          name: {
            like: {
              name  : '%a',
              title : 'b%'
            }
          }
        };
        var expect = _.cloneDeep(where);
        var Q = new Query({ where: where }, { name: 'string', title: 'string' });
        var actual = Q.criteria.where;
        assert(_.isEqual(actual, expect));
      });

    });

    it('should accept NOT expression, not only NOT Pair', function () {
      var where = {
        age: { '!': { '>': 0, '<': 100 } }
      };
      var expect;
      expect = {
        age: { $not: { $gt: 0, $lt: 100 } }
      };
      var Q = new Query({ where: where }, { age: 'integer' });
      var actual = Q.criteria.where;
      assert(_.isEqual(actual, expect));
    });

  });


  describe('against native MongoDB query criteria', function () {

    it('should accept `$exists` selector', function () {
      var where = { name: { $exists: true } };
      var expect = _.cloneDeep(where);
      var Q = new Query({ where: where }, { name: 'string' });
      var actual = Q.criteria.where;
      assert(_.isEqual(actual, expect));
    });

    it('should accept `$near` selector', function () {
      var where = {};
      where.location = {
        $near: {
          $geometry   : { type: "Point", coordinates: [ 40 , 5 ] },
          $maxDistance: 500
        }
      };
      var expect = _.cloneDeep(where);
      var Q = new Query({ where: where }, { location: 'json' });
      var actual = Q.criteria.where;
      assert(_.isEqual(actual, expect));
    });

    it('should accept `$ne` selector without turning string value to a RegExp', function () {
      var where = { name: { $ne: 'a' } };
      var expect = _.cloneDeep(where);
      var Q = new Query({ where: where }, { name: 'string' });
      var actual = Q.criteria.where;
      assert(_.isEqual(actual, expect));
    });

  });


  describe('against hybrid criteria', function () {

    it('should accept Waterline Query Pair and MongoDB Query Pair together', function () {
      var where = {
        name: { $exists: false },
        age : { '>': 1 }
      };
      var expect = { name: { $exists: false }, age: { $gt: 1 } };
      var Q = new Query({ where: where }, { name: 'string', age: 'integer' });
      var actual = Q.criteria.where;
      assert(_.isEqual(actual, expect));
    });

    it('should accept MongoDB Query Pair within Waterline OR clause', function () {
      var where = {
        or: [{ name: { $exists: false } }, { name: { '!': 'clark' } }]
      };
      var expect = { $or: [ { name: { $exists: false } }, { name: { $ne: /^clark$/i } } ] };
      var Q = new Query({ where: where }, { name: 'string', age: 'integer' });
      var actual = Q.criteria.where;
      assert(_.isEqual(actual, expect));
    });

  });

});