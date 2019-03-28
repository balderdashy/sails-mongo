/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');


/**
 * doWithConnection()
 *
 * Run the provided `during` function, passing it the provided connection.
 * Or if no connection was provided, get one from the manager (and then
 * release it afterwards automatically.)
 *
 * > Taken directly from the following code (with only very minimal modifications):
 * > https://github.com/balderdashy/sails-hook-orm/blob/1cdb652aea41e2ede2305caef0d0167b79c5c052/lib/datastore-method-utils/private/do-with-connection.js
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Dictionary} options
 *         @required {Ref} WET_MACHINES
 *         @required
 *           @either {Ref} manager
 *           @or {Ref} connection
 *
 *         @required {Function} during
 *                   @param {Ref} db   [The database connection.]
 *                   @param {Function} proceed
 *                          @param {Error?} err
 *                          @param {Ref?} resultMaybe
 *
 *         @optional {Dictionary} meta
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Function} done
 *         @param {Error?} err
 *         @param {Ref?} resultMaybe
 *                If set, this is the result sent back from the provided
 *                `during` function.
 */
module.exports = function doWithConnection(options, done){

  assert(options.WET_MACHINES);
  assert(options.manager || options.connection);
  assert(_.isFunction(options.during));
  assert(!options.meta || options.meta && _.isObject(options.meta));


  //  ╔═╗╔═╗╔═╗ ╦ ╦╦╦═╗╔═╗  ┌─┐  ┌┬┐┌┐   ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
  //  ╠═╣║  ║═╬╗║ ║║╠╦╝║╣   ├─┤   ││├┴┐  │  │ │││││││├┤ │   │ ││ ││││
  //  ╩ ╩╚═╝╚═╝╚╚═╝╩╩╚═╚═╝  ┴ ┴  ─┴┘└─┘  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
  //  ┬ ┬┌─┐┬┌┐┌┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┬─┐┬┬  ┬┌─┐┬─┐
  //  │ │└─┐│││││ ┬   │ ├─┤├┤    ││├┬┘│└┐┌┘├┤ ├┬┘
  //  └─┘└─┘┴┘└┘└─┘   ┴ ┴ ┴└─┘  ─┴┘┴└─┴ └┘ └─┘┴└─
  // If a pre-leased connection was passed in, proceed with that.
  // Otherwise, use the pre-built machines (i.e. from the adapter/driver)
  // to acquire a new connection from the manager.
  (function _ensureConnection(proceed){

    if (options.connection) {
      return proceed(undefined, options.connection);
    }//-•

    if (options.WET_MACHINES.getConnection.sync) {
      var connection;
      try {
        connection = options.WET_MACHINES.getConnection({ manager: options.manager }).execSync().connection;
        // (`report.meta` is ignored...)
      } catch (e) {
        if (e.exit === 'failed') {
          var failureReport = e.output;
          if (failureReport.meta) { failureReport.error.meta = failureReport.meta; }
          return proceed(failureReport.error);
        }
        else { return proceed(e); }
      }
      return proceed(undefined, connection);
    }//-•

    options.WET_MACHINES.getConnection({
      manager: options.manager,
      meta: options.meta
    }).switch({
      error: function (err){ return proceed(err); },
      failed: function (report){
        if (report.meta) { report.error.meta = report.meta; }
        return proceed(report.error);
      },
      success: function (report){
        // (`report.meta` is ignored)
        return proceed(undefined, report.connection);
      }
    });

  })(function (err, db){
    if (err) { return done(err); }

    //  ╦═╗╦ ╦╔╗╔  ┌┬┐┬ ┬┌─┐  \│/┌┬┐┬ ┬┬─┐┬┌┐┌┌─┐\│/  ┌─┐┬ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌
    //  ╠╦╝║ ║║║║   │ ├─┤├┤   ─ ─ │││ │├┬┘│││││ ┬─ ─  ├┤ │ │││││   │ ││ ││││
    //  ╩╚═╚═╝╝╚╝   ┴ ┴ ┴└─┘  /│\─┴┘└─┘┴└─┴┘└┘└─┘/│\  └  └─┘┘└┘└─┘ ┴ ┴└─┘┘└┘
    // Call the provided `during` function.
    (function _makeCallToDuringFn(proceed){

      // Note that, if you try to call the callback more than once in the iteratee,
      // this method logs a warning explaining what's up, ignoring any subsequent calls
      // to the callback that occur after the first one.
      var didDuringFnAlreadyHalt;
      try {
        options.during(db, function (err, resultMaybe) {
          if (err) { return proceed(err); }

          if (didDuringFnAlreadyHalt) {
            console.warn(
              'Warning: The provided `during` function triggered its callback again-- after\n'+
              'already triggering it once!  Please carefully check your `during` function\'s \n'+
              'code to figure out why this is happening.  (Ignoring this subsequent invocation...)'
            );
            return;
          }//-•

          didDuringFnAlreadyHalt = true;

          return proceed(undefined, resultMaybe);

        });//</ invoked `during` >
      } catch (e) { return proceed(e); }

    })(function (duringErr, resultMaybe){

      //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗  ┌─┐┬─┐┬─┐┌─┐┬─┐  ┌─┐┬─┐┌─┐┌┬┐  \│/┌┬┐┬ ┬┬─┐┬┌┐┌┌─┐\│/
      //  ╠═╣╠═╣║║║ ║║║  ║╣   ├┤ ├┬┘├┬┘│ │├┬┘  ├┤ ├┬┘│ ││││  ─ ─ │││ │├┬┘│││││ ┬─ ─
      //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝  └─┘┴└─┴└─└─┘┴└─  └  ┴└─└─┘┴ ┴  /│\─┴┘└─┘┴└─┴┘└┘└─┘/│\
      //   ┬   ┬─┐┌─┐┬  ┌─┐┌─┐┌─┐┌─┐  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
      //  ┌┼─  ├┬┘├┤ │  ├┤ ├─┤└─┐├┤   │  │ │││││││├┤ │   │ ││ ││││
      //  └┘   ┴└─└─┘┴─┘└─┘┴ ┴└─┘└─┘  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
      if (duringErr) {

        // Since this `duringErr` came from the userland `during` fn, we can't
        // completely trust it.  So check it out, and if it's not one already,
        // convert `duringErr` into Error instance.
        if (!_.isError(duringErr)) {

          // If this is a MongoError instance, transform it into a regular Error
          // because that's what Waterline knows how to handle.  We'll do this
          // by copying all of `duringErr`s properties into a new Error.
          if (_.isObject(duringErr) && duringErr.name === 'MongoError') {
            duringErr = (function() {
              var newError = new Error();
              _.each(Object.getOwnPropertyNames(duringErr), function(prop) {
                newError[prop] = duringErr[prop];
              });
              return newError;
            })();
          }

          else if (_.isString(duringErr)) {
            duringErr = new Error(duringErr);
          }

          else {
            duringErr = new Error(util.inspect(duringErr, {depth:5}));
          }

        }//>-

        // Before exiting with this `during` error, check to see if we acquired
        // our own ad hoc connection earlier.  If not, then go ahead and just
        // send back the `during` error.  But otherwise if so, then release our
        // ad hoc connection first before calling the `done` callback.
        if (options.connection) {
          return done(duringErr);
        }//-•

        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // > NOTE: We don't bother with the "is sync?" optimization here (see below).
        // > Since this is already an edge case, a minor performance improvement like
        // > that would be *very* low impact.  As far as I see it, I can't justify
        // > complicating things any further for negligible benefit.  But if this is
        // > a bottleneck for anyone, let me know!
        // > -@mikermcneil
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

        options.WET_MACHINES.releaseConnection({ connection: db, meta: options.meta }).switch({
          error: function(secondaryErr) {
            // This is a rare case, but still, if it happens, we make sure to tell
            // the calling code _exactly_ what occurred.
            return done(new Error(
              'The code using this db connection encountered an error:\n'+
              '``` (1)\n'+
              duringErr.stack +'\n'+
              '```\n'+
              '...AND THEN when attempting to automatically release the db connection\n'+
              '(since it was leased ad hoc), there was a secondary issue:\n'+
              '``` (2)\n'+
              secondaryErr.stack+'\n'+
              '```'
            ));
          },
          success: function(){
            return done(duringErr);
          }
        });//_∏_ </.releaseConnection()>
        return;
      }//--•


      //  ┌─┐┌┬┐┬ ┬┌─┐┬─┐┬ ┬┬┌─┐┌─┐  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗  ┌─┐┬ ┬┌─┐┌─┐┌─┐┌─┐┌─┐
      //  │ │ │ ├─┤├┤ ├┬┘││││└─┐├┤   ╠═╣╠═╣║║║ ║║║  ║╣   └─┐│ ││  │  ├┤ └─┐└─┐
      //  └─┘ ┴ ┴ ┴└─┘┴└─└┴┘┴└─┘└─┘  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝  └─┘└─┘└─┘└─┘└─┘└─┘└─┘
      //   ┬   ┬─┐┌─┐┬  ┌─┐┌─┐┌─┐┌─┐  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
      //  ┌┼─  ├┬┘├┤ │  ├┤ ├─┤└─┐├┤   │  │ │││││││├┤ │   │ ││ ││││
      //  └┘   ┴└─└─┘┴─┘└─┘┴ ┴└─┘└─┘  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
      // IWMIH, then the `during` function ran successfully.

      // Before exiting, check to see if we acquired our own ad hoc connection earlier.
      // If not, then go ahead and just send back the result from `during`.
      if (options.connection) {
        return done(undefined, resultMaybe);
      }//-•

      // But otherwise, we must have made an ad hoc connection earlier.
      // So before calling the `done` callback, try to release it.
      // > NOTE: The exact code for doing so differs depending on whether the function
      // > is synchronous or not.  (This is not strictly necessary, it's just an optimization.)
      if (options.WET_MACHINES.releaseConnection.sync) {
        try {
          options.WET_MACHINES.releaseConnection({ connection: db, meta: options.meta }).execSync();
          // (`report.meta` is ignored...)
        } catch (secondaryErr) {
          return done(new Error(
            'The code in the provided `during` function ran successfully with this\n'+
            'db connection, but afterwards, when attempting to automatically release\n'+
            'the connection (since it was leased ad hoc), there was an error:\n'+
            '```\n' +
            secondaryErr.stack+'\n'+
            '```'
          ));
        }
        return done(undefined, resultMaybe);
      }//-•

      options.WET_MACHINES.releaseConnection({ connection: db, meta: options.meta }).switch({
        error: function(secondaryErr) {
          return done(new Error(
            'The code in the provided `during` function ran successfully with this\n'+
            'db connection, but afterwards, when attempting to automatically release\n'+
            'the connection (since it was leased ad hoc), there was an error:\n'+
            '```\n' +
            secondaryErr.stack+'\n'+
            '```'
          ));
        },
        success: function(){
          return done(undefined, resultMaybe);
        }
      });//</.releaseConnection()>

    });//</ _makeCallToDuringFn (self-invoking function) >
  });//</ _ensureConnection (self-invoking function)>
};
