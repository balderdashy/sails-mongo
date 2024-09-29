/**
 * Module dependencies
 */

var normalizeMongoObjectId = require('./normalize-mongo-object-id');

/**
 * tryNormalizeMongoObjectId()
 *
 * Attempts to convert the given value to a Mongo ObjectId and return it. If the value
 * simply cannot be interpreted as an ObjectId, it will be returned as-is.
 *
 * This function is equivalent to calling the `normalizeMongoObjectId()` function with
 * tolerance for the `E_CANNOT_INTERPRET_AS_OBJECTID` error whereby the input value is
 * yielded instead in such cases, allowing one to avoid inlining try-catch blocks.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param value - Value to attempt normalization of.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns Returns the given value normalized to an `ObjectId` if possible. Otherwise
 * returns the original value.
 */
module.exports = function tryNormalizeMongoObjectId(value) {
  try {
    return normalizeMongoObjectId(value);
  } catch (e) {
    switch (e.code) {
      case 'E_CANNOT_INTERPRET_AS_OBJECTID': return value;
      default: throw e;
    }
  }
};
