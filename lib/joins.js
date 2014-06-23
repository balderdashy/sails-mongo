/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var async = require('async');
var _defaultsDeep = require('merge-defaults');



/**
 * Run joins (adapter-agnostic)
 * 
 * TODO:
 * pull this stuff out into a separate module that can be shared
 * across all noSQL adapters.  Relational adapters can use some of
 * this stuff, but their operation runner + integration step will
 * look a bit different.
 * 
 * @param  {Object}   options
 *                      .parentResults
 *                      .instructions
 *                      .$find()  {Function}
 *                      .$getPK() {Function}
 *                      
 * @param  {Function} cb
 */

module.exports = function _runJoins (options, cb) {
  
  // Create local variables from the options to make
  // the code below more human-readable
  var parentResults = options.parentResults;
  var joinInstructions = options.instructions;
  var $find = options.$find;
  var $getPK = options.$getPK;


  // Group the joinInstructions array by "alias", then interate over each one
  // s.t. `instructions` in our lambda function contains a list of join instructions
  // for the particular `populate` on the specified logical attribute (i.e. alias).
  // 
  // Note that `parentResults` will be mutated inline.
  var joinsByAssociation = _.groupBy(joinInstructions, 'alias');

  async.each( _.keys(joinsByAssociation), function eachAssociation( attrName, next ) {
    _joinOneParticularAssoc({
      attrName: attrName,
      instructions: joinsByAssociation[attrName],
      parentResults: parentResults,
      $find: $find,
      $getPK: $getPK
    }, next);
  }, function _afterwards(err) {
    if (err) return cb(err);

    // Parent records are modified in-place, so we can just send them back.
    return cb(null, parentResults);
  });

};







/**
 * Association strategy constants
 */

var HAS_FK = 1;
var VIA_FK = 2;
var VIA_JUNCTOR = 3;


/**
 * _joinOneParticularAssoc()
 * 
 * @param  {Object}   options
 *                      .attrName
 *                      .parentResults
 *                      .instructions
 *                      .$find()  {Function}
 *                      .$getPK() {Function}
 *
 * @param  {Function} cb
 *
 */
function _joinOneParticularAssoc (options, cb) {

  // Create local variables from the options to make
  // the code below more human-readable
  var attrName = options.attrName;
  var instructions = options.instructions;
  var parentResults = options.parentResults;
  var $find = options.$find;
  var $getPK = options.$getPK;
  

  // If no join instructions were provided, we're done!
  if (instructions.length === 0) {
    return cb(null, parentResults);
  }

  // console.log(
  //   'Preparing to populate the "%s" attr for %d parent result(s)...',
  //   attrName, parentResults.length
  // );


  // ------------------------- (((•))) ------------------------- //

  //
  // Step 1:
  // Plan the query.
  // 

  // Lookup relevant collection identities and primary keys
  var parentIdentity = _.first(instructions).parent;
  var childIdentity = _.last(instructions).child;
  var parentPK = $getPK(parentIdentity);
  var childPK = $getPK(childIdentity);

  // For convenience, precalculate the array of primary key values
  // from the parent results for use in the association strategy
  // implementation code below.
  var parentResultPKVals = _.pluck(parentResults, parentPK);

  // Lookup the base child criteria
  // (populate..where, populate..limit, etc.)
  //
  // Note that default limit, etc. should not be applied here
  // since they are taken care of in Waterline core.
  var childCriteria = _.last(instructions).criteria || {};

  // Determine the type of association rule (i.e. "strategy") we'll be using.
  // 
  // Note that in future versions of waterline, this logic
  // will be internalized to simplify adapter implementation.
  var strategy = (
    // If there are more than one join instructions, there must be an
    // intermediate (junctor) collection involved
    instructions.length === 2 ? VIA_JUNCTOR :
    // If the parent's PK IS the foreign key (i.e. parentKey) specified
    // in the join instructions, we know to use the `viaFK` AR (i.e. belongsToMany)
    instructions[0].parentKey === parentPK ? VIA_FK :
    // Otherwise this is a basic foreign key component relationship
    HAS_FK
  );

  if (!strategy) {
    return cb(new Error('Could not derive association strategy in adapter'));
  }

  // Now lookup strategy-specific association metadata.

  // `parentFK` will only be meaningful if this is the `HAS_FK` strategy.
  var parentFK = instructions[0].parentKey;

  // `childFK` will only be meaningful if this is the `VIA_FK` strategy.
  var childFK = instructions[0].childKey;

  // `junctorIdentity`, `junctorFKToParent`, `junctorFKToChild`, and `junctorPK`
  // will only be meaningful if this is the `VIA_JUNCTOR` strategy.
  var junctorIdentity = instructions[0].child;
  var junctorPK = $getPK(instructions[0].child);
  var junctorFKToParent = instructions[0].childKey;
  var junctorFKToChild = instructions[1] && instructions[1].parentKey;


  // IMPORTANT:
  // If the child criteria has a `sort`, `limit`, or `skip`, then we must execute
  // N child queries; where N is the number of parent results.
  // Otherwise the result set will not be accurate.
  var canCombineChildQueries = !!(
    childCriteria.sort  ||
    childCriteria.limit ||
    childCriteria.skip
  );

  // SKIP THIS STEP ENTIRELY FOR NOW
  // TODO: implement this optimization
  canCombineChildQueries = false;



  // ------------------------- (((•))) ------------------------- //


  // Step 2:
  // Build up a set of buffer objects, each representing a find (or for the VIA_JUNCTOR
  // strategy, a nested find), and where the results from that find should be injected-
  // i.e. the related parent record(s) and the name of the attribute.
  var buffers = _.reduce(parentResults,
    function _buildBuffersUsingParentResults (buffers, parentRecord) {
      buffers.push({
        attrName: attrName,
        belongsToPKValue: parentRecord[parentPK],

        // Optional (only used if implementing a HAS_FK strategy)
        belongsToFKValue: parentRecord[parentFK]
      });
      return buffers;
    },
  []);


  // ------------------------- (((•))) ------------------------- //




  //
  // Step 3:
  // Communicate with the datastore to grab relevant child records.
  //

  (function fetchRelevantChildRecords(_onwards) {

    if (canCombineChildQueries) {

      // Special case for VIA_JUNCTOR:
      if (strategy === VIA_JUNCTOR) {
        return next(new Error('via_junctor not implemented yet'));
      }
      else {
        switch (strategy) {
          case HAS_FK:
            _where[childPK] = _.pluck(parentResults, parentFK);
            return _where;
          case VIA_FK:
            _where[childFK] = _.pluck(parentResults, parentPK);
            return _where;
        }
      }
      return _onwards(new Error('not implemented yet!'));
    }


    // Now execute the queries
    async.each(buffers, function (buffer, next){

      // •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
      // NOTE:
      // This step could be optimized by calculating the query function
      // ahead of time since we already know the association strategy it
      // will use before runtime.
      // •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••

      // Special case for VIA_JUNCTOR:
      if (strategy === VIA_JUNCTOR) {
        
        // NOTE:
        // (TODO: look at optimizing this later)
        // I think for this strategy we can always find all of the junctor
        // records relating to ANY of the parent records ahead of time, and
        // the `canCombineChildQueries` distinction is really just limited
        // to that third [set of] quer[ies/y].  For now, we just do a separate
        // query to the junctor for each parent record to keep things tight.
        var junctorCriteria = {where:{}};
        junctorCriteria.where[junctorFKToParent] = buffer.belongsToPKValue;

        $find( junctorIdentity, junctorCriteria,
        function _afterFetchingJunctorRecords(err, junctorRecordsForThisBuffer) {
          if (err) return next(err);

          // Build criteria to find matching child records which are also
          // related to ANY of the junctor records we just fetched.
          var bufferChildCriteria = _defaultsDeep((function _buildBufferCriteriaChangeset (_criteria) {
            _criteria.where[childPK] = _.pluck(junctorRecordsForThisBuffer, junctorFKToChild);
            return _criteria;
          })({where:{}}), childCriteria);

          // Now find related child records
          $find( childIdentity, bufferChildCriteria,
          function _afterFetchingRelatedChildRecords(err, childRecordsForThisBuffer) {
            if (err) return next(err);
            
            buffer.records = childRecordsForThisBuffer;
            return next();
          });
        });

      }
      // General case for the other strategies:
      else {
        
        var criteriaToPopulateBuffer =
        _defaultsDeep((function _buildBufferCriteriaChangeset () {
          return {
            where: (function _buildBufferWHERE (_where){
              switch (strategy) {
                case HAS_FK:
                  _where[childPK] = buffer.belongsToFKValue;
                  return _where;
                case VIA_FK:
                  _where[childFK] = buffer.belongsToPKValue;
                  return _where;
              }
            })({})
          };
        })(), childCriteria);

        // console.log(
        //   'Populating buffer for parent record "%s" using the following criteria: \n',
        //   buffer.belongsToPKValue,
        //   util.inspect(criteriaToPopulateBuffer, false, null)
        // );

        $find( childIdentity, criteriaToPopulateBuffer,
        function _afterFetchingBufferRecords(err, childRecordsForThisBuffer) {
          if (err) return next(err);

          // console.log('CHILD RECORDS FOUND FOR THIS BUFFER (%s):',
          //   attrName,
          //   util.inspect(childRecordsForThisBuffer, false, null));
          
          buffer.records = childRecordsForThisBuffer;
          return next();
        });
      }

    }, _onwards);

  })(function _afterwards(err) {
    if (err) return cb(err);



    // ------------------------- (((•))) ------------------------- //

    // Step 4:
    // Smash each child buffer into the appropriate spot
    // within the parent results.
    // 
    // NOTE: parent results are modified in-place

    if (canCombineChildQueries) {
      // switch (strategy) {
      //   case HAS_FK:
      //     // TODO
      //     break;


      //   case VIA_FK:
      //     // TODO
      //     break;


      //   case VIA_JUNCTOR:
      //     // TODO
      //     break;
      // }
      return cb(new Error('not implemented yet!'), parentResultsBeingAugmented);
    }

    // console.log('\n\n\n--------BUFFERS--------\n',util.inspect(buffers, false, null));
    // return cb(new Error('see logs'));

    _.each(buffers, function (buffer){
      if (buffer.records && buffer.records.length) {
        
        var matchingParentRecord = _.find(parentResults, function (parentRecord) {
          return parentRecord[parentPK] === buffer.belongsToPKValue;
        });

        // This should always be true, but checking just in case.
        if (_.isObject(matchingParentRecord)) {

          // If the value in `attrName` for this record is not an array,
          // it is probably a foreign key value.  Fortunately, at this point
          // we can go ahead and replace it safely since any logic relying on it
          // is complete (i.e. although we may still have other queries finishing
          // up for other association attributes, we're done populating THIS one, see?)
          //
          // In fact, and for the same reason, we can safely override the value of
          // `buffer.attrName` for the parent record at this point, no matter what!
          // This is nice, because `buffer.records` is already sorted, limited, and
          // skipped, so we don't have to mess with that.
          matchingParentRecord[buffer.attrName] = buffer.records;
        }
      }
    });

    // Note that we do ensure that an empty array gets sent back for each parent
    // record (since unnecessary buffers and their `buffer.records` remain undefined
    // until set to save RAM) This is important for compatibility with WL1 core
    parentResults = _.map(parentResults, function (parentRecord) {
      parentRecord[attrName] = parentRecord[attrName]||[];
    });

    // Done!
    // (parent records are modified in place, no need to pass anything back.)
    return cb();
  });


}
