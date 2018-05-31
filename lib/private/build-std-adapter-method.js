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
 * create: buildStdAdapterMethod(helpCreate, WET_MACHINES, registeredDsEntries, registeredDryModels),
 * ```
 *
 * > NOTE:
 * > This is a stopgap.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Dictionary} machineDef  (dry)
 * @param  {Dictionary} WET_MACHINES  (for convenience)
 * @param  {Dictionary} registeredDsEntries
 * @param  {Dictionary} registeredDryModels
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns {Function}
 *          @param {String} datastoreName
 *          @param {Dictionary} s3q
 *          @param {Function} done
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function buildStdAdapterMethod (machineDef, WET_MACHINES, registeredDsEntries, registeredDryModels) {

  // Build wet machine.
  var performQuery = Machine.build(machineDef);

  // Return function that will be the adapter method.
  return function (datastoreName, s3q, done) {

    // Look up the datastore entry (to get the manager).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Obtain a connection.
    doWithConnection({
      WET_MACHINES: WET_MACHINES,
      manager: dsEntry.manager,
      connection: (s3q.meta && s3q.meta.leasedConnection) || undefined,
      meta: s3q.meta,
      during: function (connection, proceed) {

        var handlers = {
          error: function (err) { return proceed(err); },
          success: function (result) { return proceed(undefined, result); }
        };
        // If this machine has a `notUnique` exit, then set up a `notUnique` handler.
        // > (Note that `err.footprint` should already be attached, so there's no need to mess w/ it.)
        if (machineDef.exits.notUnique) {
          handlers.notUnique = function (err) { return proceed(err); };
        }

        // Perform the query (and if relevant, send back a result.)
        performQuery({
          query: s3q,
          connection: connection,
          dryOrm: { models: registeredDryModels }
        }).switch(handlers);

      }//</:during>
    }, done);//</doWithConnection()>

  };//</returned function def>

};

