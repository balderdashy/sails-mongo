/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var ObjectId = require('mongodb').ObjectID || require('mongodb').ObjectId;

/**
 * normalizeMongoObjectId()
 *
 * Ensure that the provided reference is either an Object Id instance;
 * or if it isn't, then attempt to construct one from it.
 * -----------------------------------------------------------------------------
 * @param  {Ref} supposedId [either a hex string or an ObjectId instance)
 * @returns {Ref}  [an ObjectId instance]
 * @throws {E_CANNOT_INTERPRET_AS_OBJECTID}
 * -----------------------------------------------------------------------------
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * > WARNING: .toString() is inconsistent!  In the Node.js client, it
 * > returns the actual hex string, but beware: in the Mongo console,
 * > it returns a string like `ObjectId("asdgasdgasdgasgd")` instead!
 * > Similarly, the behavior of `.valueOf()` is different in the Node.js
 * > client, and there is no `str` property!  (For details, compare the
 * > example just below with the docs on the MongoDB website at e.g.
 * > https://docs.mongodb.com/manual/reference/method/ObjectId/)
 *
 * In Mongo shell:
 * ```
 * > o=new ObjectId()
 * ObjectId("58ab008e7707847e54dd28bb")
 * > o
 * ObjectId("58ab008e7707847e54dd28bb")
 * > o.toString()
 * ObjectId("58ab008e7707847e54dd28bb")
 * > o.toString() === '58ab008e7707847e54dd28bb'
 * false
 * 58ab008e7707847e54dd28bb
 * > o.valueOf()
 * 58ab008e7707847e54dd28bb
 * > o.str === o.valueOf()
 * true
 * >
 * ```
 *
 * In Node.js shell:
 * ```
 * > o = new require('mongodb').ObjectId('58ab07042797833afe5fd4c8')
 * 58ab07042797833afe5fd4c8
 * > typeof o
 * 'object'
 * > typeof o.toString()
 * 'string'
 * > typeof o.valueOf()
 * 'object'
 * > o.valueOf()
 * 58ab07042797833afe5fd4c8
 * > o.toString()
 * '58ab07042797833afe5fd4c8'
 * > o.str
 * undefined
 * >
 * ```
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function normalizeMongoObjectId(supposedId) {

  // First of all, if the supposed id is a Mongo ObjectId instance,
  // then just return it, straight away.
  if (_.isObject(supposedId) && supposedId instanceof ObjectId){
    return supposedId;
  }
  // Otherwise try to interpret the supposed mongo id as a hex string.
  // (note that we also implement a failsafe)
  else if (_.isString(supposedId) && ObjectId.isValid(supposedId)) {
    var objectified = new ObjectId(supposedId);

    // Sanity check:
    if (objectified.toString() !== supposedId) {
      throw new Error(
        'Consistency violation: Unexpected result interpreting `'+supposedId+'` as a Mongo ObjectId.  '+
        'After instantiating the provided value as an ObjectId instance, then calling .toString() '+
        'on it, the result (`'+objectified.toString()+'`) is somehow DIFFERENT than the originally-provided '+
        'value (`'+supposedId+'`)... even though the mongo lib said it was `.isValid()`.  (This is likely '+
        'due to a bug in the Mongo adapter, or somewhere else along the way.  Please report at http://sailsjs.com/bugs)'
      );
    }//-•

    return objectified;
  }
  // Otherwise, give up.
  else {
    throw flaverr('E_CANNOT_INTERPRET_AS_OBJECTID', new Error(
      'Cannot interpret `'+supposedId+'` as a Mongo id.\n'+
      '(Usually, this is the result of a bug in application logic.)\n'+
      'For more info on Mongo ids, see:\n'+
      '• https://docs.mongodb.com/manual/reference/bson-types/#objectid\n'+
      '• http://sailsjs.com/support'
    ));
  }

};
