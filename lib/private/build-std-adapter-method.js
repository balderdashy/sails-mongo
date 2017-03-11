/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var Machine = require('machine');
var doWithConnection = require('./do-with-connection');


/**
 * buildStdAdapterMethod()
 *
 * Build a generic DQL/DML adapter method from a machine definition and available state.
 *
 * Example usage:
 * ```
 * create: buildStdAdapterMethod(helpCreate, WLDriver, registeredDsEntries, registeredPhModels),
 * ```
 *
 * > NOTE:
 * > This is a stopgap.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Dictionary} machineDef  (dry)
 * @param  {Dictionary} WLDriver  (for convenience)
 * @param  {Dictionary} registeredDsEntries
 * @param  {Dictionary} registeredPhModels
 * @param  {Function} handleTransformingResultSync
 *         @param {Dictionary} report
 *         @returns {Ref?}
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns {Function}
 *          @param {String} datastoreName
 *          @param {Dictionary} s3q
 *          @param {Function} done
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function buildStdAdapterMethod (machineDef, WLDriver, registeredDsEntries, registeredPhModels, handleTransformingResultSync) {

  // Build wet machine.
  var performQuery = Machine.build(machineDef);

  // Return function that will be the adapter method.
  return function (datastoreName, s3q, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Obtain a connection.
    doWithConnection({
      driver: WLDriver,
      manager: dsEntry.manager,
      connection: (s3q.meta && s3q.meta.leasedConnection) || undefined,
      meta: s3q.meta,
      during: function (connection, proceed) {

        // Perform the query (and if relevant, send back a result.)
        performQuery({
          query: s3q,
          connection: connection,
          models: registeredPhModels,
          meta: s3q.meta
        }).exec({
          error: function (err) { return proceed(err); },
          notUnique: function (err) { return proceed(err); },//<< `footprint` is already attached
          success: function (report) {
            var transformedResult = handleTransformingResultSync(report);
            return proceed(undefined, transformedResult);
          }
        });

      }//</:during>
    }, done);//</doWithConnection()>

  };//</returned function def>

};

