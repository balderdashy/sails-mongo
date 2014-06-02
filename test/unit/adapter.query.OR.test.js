var Query = require('../../lib/query');
var assert = require('assert');
var _ = require('lodash');

describe('Query', function() {

  describe('normalize OR clause', function() {

    it('should allow OR and an array value', function() {
      var options = {
        where: {
          or: [
            {
              id: [
                "536014d4226745c20e40fcb6",
                "52aa8260bcbb564333000023"
              ]
            },
            {
              name: "foo"
            }
          ]
        }
      };

      var Q = new Query(options, { id: { type: 'string' }});
      var criteria = Q.criteria.where;

      assert(criteria.hasOwnProperty('$or'));
      assert(criteria['$or'].length === 2);
      assert(criteria['$or'][0].hasOwnProperty('_id'));
      assert(criteria['$or'][0]._id.hasOwnProperty('$in'));
      assert(criteria['$or'][0]._id['$in'].length === 2);
      assert(criteria['$or'][1].hasOwnProperty('name'));
    });

    it('should accept `null` clause without throwing error', function () {
      var options = {
        where: {
          or: [null]
        }
      };
      var Q = new Query(options, { id: { type: 'string' }});
      var criteria = Q.criteria.where;
      assert(criteria.hasOwnProperty('$or'));
      assert(criteria['$or'].length === 1);
      assert(_.isEmpty(criteria['$or'][0]));
    });

    it('should accept `null` without throwing error', function () {
      var options = {
        where: {
          or: null
        }
      };
      var Q = new Query(options, { id: { type: 'string' }});
      var criteria = Q.criteria.where;
      assert(criteria.hasOwnProperty('$or') === false);
    });

  });

});
