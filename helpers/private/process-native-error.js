/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');


/**
 * processNativeError()
 *
 * Examine the provided native error and attach a `footprint`, if appropriate.
 * > The error may be mutated in place -- or rarely, a new Error instance might be returned.
 *
 * @param  {Error} err
 * @returns {Error}
 */
module.exports = function processNativeError(err) {

  // Verify that there is no pre-existing footprint.
  // (This should never happen)
  if (!_.isUndefined(err.footprint)) {
    return new Error('Consistency violation: Raw error from MongoDB arrived with a pre-existing `footprint` property!  Should never happen... but maybe this error didn\'t actually come from Mongo..?  Here\'s the error:\n\n```\n'+err.stack+'\n```\n');
  }

  //  ███╗   ██╗ ██████╗ ████████╗    ██╗   ██╗███╗   ██╗██╗ ██████╗ ██╗   ██╗███████╗
  //  ████╗  ██║██╔═══██╗╚══██╔══╝    ██║   ██║████╗  ██║██║██╔═══██╗██║   ██║██╔════╝
  //  ██╔██╗ ██║██║   ██║   ██║       ██║   ██║██╔██╗ ██║██║██║   ██║██║   ██║█████╗
  //  ██║╚██╗██║██║   ██║   ██║       ██║   ██║██║╚██╗██║██║██║▄▄ ██║██║   ██║██╔══╝
  //  ██║ ╚████║╚██████╔╝   ██║       ╚██████╔╝██║ ╚████║██║╚██████╔╝╚██████╔╝███████╗
  //  ╚═╝  ╚═══╝ ╚═════╝    ╚═╝        ╚═════╝ ╚═╝  ╚═══╝╚═╝ ╚══▀▀═╝  ╚═════╝ ╚══════╝
  //
  if (err.code === 11000 || err.code === 11001) {

    // Attach the baseline footprint.
    // > FUTURE: As a micro-optimization, could pull this out into a constructor
    // > (see post-mortem notes from the parley benchmarks)
    err.footprint = {
      identity: 'notUnique',
      keys: []
    };

    // If we can infer which field this error is referring to, then add
    // that problematic key to the `keys` array of the footprint.
    // > Remember, this is by "columnName", not attr name!
    var problematicKey;

    // HERE'S HOW WE DO IT:
    // Locate a value in the new record that matches the problematic value
    // that the raw native error claims triggered the uniqueness violation,
    // then push its key on the `err.footoprint.keys` array.
    //
    // (If more than one matching value is found, then there isn't enough
    // information to decisively confirm which field was the culprit.  So
    // in that case, we won't consider either to be a valid match, and will
    // leave `err.footoprint.keys` as an empty array.)
    //
    // > FUTURE: see if there's any way we can improve the accuracy here.
    var problematicValue = err.key;
    _.any(query.newRecord, function (val, key){
      if (problematicValue !== val) {
        return;//(continue)
      }

      if (_.isUndefined(problematicKey)) {
        problematicKey = key;
        return;//(continue)
      }

      problematicKey = undefined;
      return true;//(break)
    });

    if (problematicKey) {
      err.footprint.keys.push(problematicKey);
    }

    return err;

  }//‡-•
  //  ███╗   ███╗██╗███████╗ ██████╗
  //  ████╗ ████║██║██╔════╝██╔════╝
  //  ██╔████╔██║██║███████╗██║
  //  ██║╚██╔╝██║██║╚════██║██║
  //  ██║ ╚═╝ ██║██║███████║╚██████╗██╗
  //  ╚═╝     ╚═╝╚═╝╚══════╝ ╚═════╝╚═╝
  //
  else {
    return err;
  }

};
