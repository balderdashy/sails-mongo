var Query = require('../../../lib/query');
var assert = require('assert');
var _ = require('lodash');
var ObjectID = require('mongodb').ObjectID;

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

    describe('with objectid values', function () {

      it('should accept objectid in Equal Pair', function () {
        var _id = new ObjectID();
        var where = {
          user: new ObjectID(_id)
        };
        var expect = {
          user: new ObjectID(_id)
        };
        var Q = new Query({ where: where }, { user: 'objectid' });
        var actual = Q.criteria.where;
        assert(_.isEqual(actual['user'].toString(), expect['user'].toString()));
      });

      it('should accept objectid in Not Pair', function () {
        var _id = new ObjectID();
        var where = {
          user: { '!': new ObjectID(_id) }
        };
        var expect = {
          user: { $ne: new ObjectID(_id) }
        };
        var Q = new Query({ where: where }, { user: 'objectid' });
        var actual = Q.criteria.where;
        assert(_.isEqual(actual['user']['$ne'].toString(), expect['user']['$ne'].toString()));
      });

      it('should accept objectid in In Pair', function () {
        var _ids = [new ObjectID(), new ObjectID()];
        var where = {
          user: [new ObjectID(_ids[0]), new ObjectID(_ids[1])]
        };
        var expect = {
          user: { $in: [new ObjectID(_ids[0]), new ObjectID(_ids[1])] }
        };
        var Q = new Query({ where: where }, { user: 'objectid' });
        var actual = Q.criteria.where;
        assert(_.isEqual(actual['user']['$in'][0].toString(), expect['user']['$in'][0].toString()));
        assert(_.isEqual(actual['user']['$in'][1].toString(), expect['user']['$in'][1].toString()));
      });

      it('should accept objectid in Object Pair', function () {
        var _id = new ObjectID();
        var where = {
          user: { '>': new ObjectID(_id) }
        };
        var expect = {
          user: { $gt: new ObjectID(_id) }
        };
        var Q = new Query({ where: where }, { user: 'objectid' });
        var actual = Q.criteria.where;
        assert(_.isEqual(actual['user']['$gt'].toString(), expect['user']['$gt'].toString()));
        assert(_.isEqual(actual['user']['$gt'].toString(), expect['user']['$gt'].toString()));
      });

    });

    describe('with `in` clause', function () {

      it('should parse as `$in` clause', function () {
        var id1 = new ObjectID(), id2 = new ObjectID(), id3 = new ObjectID();
        var where = {
          id: [id1.toString(), id2.toString(), id3.toString() ]
        };
        var expect;
        expect = {
          _id: { $in: [id1, id2, id3] }
        };
        var Q = new Query({ where: where }, { id: { type: 'objectid', primaryKey: true } });
        var actual = Q.criteria.where;
        assert(_.isEqual(actual, expect));
      });

    });

    describe('with `not in` clause', function () {

      it('should parse as `$nin` clause', function () {
        var id1 = new ObjectID(), id2 = new ObjectID(), id3 = new ObjectID();
        var where = {
          id: { '!': [id1.toString(), id2.toString(), id3.toString() ] }
        };
        var expect;
        expect = {
          _id: { $nin: [id1, id2, id3] }
        };
        var Q = new Query({ where: where }, { id: { type: 'objectid', primaryKey: true } });
        var actual = Q.criteria.where;
        assert(_.isEqual(actual, expect));
      });

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

    it('should accept `$gt` selector without turning string value to a RegExp', function () {
      var where = { name: { $gt: 'banana' } };
      var expect = _.cloneDeep(where);
      var Q = new Query({ where: where }, { name: 'string' });
      var actual = Q.criteria.where;
      assert(_.isEqual(actual, expect));
    });

    it('should accept `$gte` selector without turning string value to a RegExp', function () {
      var where = { name: { $gte: 'apple' } };
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
      var expect = { $or: [ { name: { $exists: false } }, { name: { $ne: 'clark' } } ] };
      var Q = new Query({ where: where }, { name: 'string', age: 'integer' });
      var actual = Q.criteria.where;
      assert(_.isEqual(actual, expect));
    });

  });

});
