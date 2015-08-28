var assert = require('assert');
var clarifyError = require('../../lib/utils').clarifyError;

describe('clarifyError', function () {
  it('returns the original error object if it does not have the proper error code', function () {
    var err = new Error();
    err.code = 9001;

    var validationError = clarifyError(err);
    assert.strictEqual(validationError, err);
  });

  it('returns a validation error if passed a MongoDB duplicate key error', function () {
    var err = createError('test', 'collection', 'name', 'test');
    var validationError = clarifyError(err);

    assert(validationError.code === 'E_UNIQUE');
  });

  it('extracts properties from the error message and populates the validation error', function () {
    var err = createError('test', 'collection', 'name', 'test');
    var validationError = clarifyError(err);

    assert.strictEqual(validationError.code, 'E_UNIQUE');
    assert(validationError.invalidAttributes['name'] && validationError.invalidAttributes['name'][0]);
    assert.strictEqual(validationError.invalidAttributes['name'][0].rule, 'unique');
    assert.strictEqual(validationError.invalidAttributes['name'][0].value, 'test');
    assert.strictEqual(validationError.originalError, err);
  });

  it('handles underscores in database names, collections, and attributes correctly', function () {
    var err = createError('test_db', 'my_collection_name', 'my_field_name', 'test_value');
    var validationError = clarifyError(err);

    assert.strictEqual(validationError.code, 'E_UNIQUE');
    assert(validationError.invalidAttributes['my_field_name'] && validationError.invalidAttributes['my_field_name'][0]);
    assert.strictEqual(validationError.invalidAttributes['my_field_name'][0].rule, 'unique');
    assert.strictEqual(validationError.invalidAttributes['my_field_name'][0].value, 'test_value');
    assert.strictEqual(validationError.originalError, err);
  });

  it('handles attributes ending in _[digits] correctly', function () {
    var err = createError('test', 'collection', 'name_123', 'test');
    var validationError = clarifyError(err);

    assert.strictEqual(validationError.code, 'E_UNIQUE');
    assert(validationError.invalidAttributes['name_123'] && validationError.invalidAttributes['name_123'][0]);
    assert.strictEqual(validationError.invalidAttributes['name_123'][0].rule, 'unique');
    assert.strictEqual(validationError.invalidAttributes['name_123'][0].value, 'test');
    assert.strictEqual(validationError.originalError, err);
  });

  it('handles values with escaped quotation marks correctly', function () {
    var err = createError('test', 'collection', 'name', '"this" here \\is\\ a "test"');
    var validationError = clarifyError(err);

    assert.strictEqual(validationError.code, 'E_UNIQUE');
    assert(validationError.invalidAttributes['name'] && validationError.invalidAttributes['name'][0]);
    assert.strictEqual(validationError.invalidAttributes['name'][0].rule, 'unique');
    assert.strictEqual(validationError.invalidAttributes['name'][0].value, '"this" here \\is\\ a "test"');
    assert.strictEqual(validationError.originalError, err);
  });

  it('handles non-string values correctly', function () {
    var err = createError('test', 'collection', 'name', 360.25);
    var validationError = clarifyError(err);

    assert.strictEqual(validationError.code, 'E_UNIQUE');
    assert(validationError.invalidAttributes['name'] && validationError.invalidAttributes['name'][0]);
    assert.strictEqual(validationError.invalidAttributes['name'][0].rule, 'unique');
    assert.strictEqual(validationError.invalidAttributes['name'][0].value, 360.25);
    assert.strictEqual(validationError.originalError, err);
  });

  it('uses the string representation of non-JSON-serializable values', function () {
    var err = createError('test', 'collection', 'name', 'ObjectId("507f191e810c19729de860ea")');
    var validationError = clarifyError(err);

    assert.strictEqual(validationError.code, 'E_UNIQUE');
    assert(validationError.invalidAttributes['name'] && validationError.invalidAttributes['name'][0]);
    assert.strictEqual(validationError.invalidAttributes['name'][0].rule, 'unique');
    assert.strictEqual(validationError.invalidAttributes['name'][0].value, 'ObjectId("507f191e810c19729de860ea")');
    assert.strictEqual(validationError.originalError, err);
  });
});

/**
 * Generates an error object that emulates a MongoDB duplicate key error
 * @param {string} database
 * @param {string} collection
 * @param {string} attribute
 * @param {string} value
 * @returns {object} Error object with code and errmsg
 */
function createError (database, collection, attribute, value) {
  return {
    code: 11000,
    errmsg: 'E11000 duplicate key error index: ' + database + '.' + collection + '.' + '$' + attribute + '_42 dup key: { : ' + JSON.stringify(value) + ' }'
  };
}