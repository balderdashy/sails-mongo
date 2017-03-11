/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var async = require('async');
var WLDriver = require('machinepack-mongo');
var normalizeDatastoreConfig = require('./private/normalize-datastore-config');
var doWithConnection = require('./private/do-with-connection');
var helpCreate = require('./private/machines/create');


/**
 * Module state
 */

// Private var to track of all the datastores that use this adapter.  In order for your adapter
// to be able to connect to the database, you'll want to expose this var publicly as well.
// (See the `registerDatastore()` method for info on the format of each datastore entry herein.)
//
// > Note that this approach of process global state will be changing in an upcoming version of
// > the Waterline adapter spec (a breaking change).  But if you follow the conventions laid out
// > below in this adapter template, future upgrades should be a breeze.
var registeredDsEntries = {};


// Keep track of all the model definitions registered by the adapter (for the entire Node process).
// (indexed by the model's `identity` -- NOT by its `tableName`!!)
var registeredPhModels = {};



/**
 *  ███████╗ █████╗ ██╗██╗     ███████╗      ███╗   ███╗ ██████╗ ███╗   ██╗ ██████╗  ██████╗
 *  ██╔════╝██╔══██╗██║██║     ██╔════╝      ████╗ ████║██╔═══██╗████╗  ██║██╔════╝ ██╔═══██╗
 *  ███████╗███████║██║██║     ███████╗█████╗██╔████╔██║██║   ██║██╔██╗ ██║██║  ███╗██║   ██║
 *  ╚════██║██╔══██║██║██║     ╚════██║╚════╝██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║██║   ██║
 *  ███████║██║  ██║██║███████╗███████║      ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║╚██████╔╝╚██████╔╝
 *  ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝      ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝
 * (sails-mongo)
 *
 * Sails.js/Waterline adapter for the MongoDB database.
 *
 * > Most of the methods below are optional.
 * >
 * > If you don't need / can't get to every method, just implement
 * > what you have time for.  The other methods will only fail if
 * > you try to call them!
 * >
 * > For many adapters, this file is all you need.  For very complex adapters, you may need more flexiblity.
 * > In any case, it's probably a good idea to start with one file and refactor only if necessary.
 * > If you do go that route, it's conventional in Node to create a `./lib` directory for your private submodules
 * > and `require` them at the top of this file with other dependencies. e.g.:
 * > ```
 * > var updateMethod = require('./lib/update');
 * > ```
 *
 * @type {Dictionary}
 */


// Expose the adapter definition
module.exports = {


  // The identity of this adapter, to be referenced by datastore configurations in a Sails app.
  identity: 'sails-mongo',


  // Waterline Adapter API Version
  //
  // > Note that this is not necessarily tied to the major version release cycle of Sails/Waterline!
  // > For example, Sails v1.5.0 might generate apps which use sails-hook-orm@2.3.0, which might
  // > include Waterline v0.13.4.  And all those things might rely on version 1 of the adapter API.
  // > But Waterline v0.13.5 might support version 2 of the adapter API!!  And while you can generally
  // > trust semantic versioning to predict/understand userland API changes, be aware that the maximum
  // > and/or minimum _adapter API version_ supported by Waterline could be incremented between major
  // > version releases.  When possible, compatibility for past versions of the adapter spec will be
  // > maintained; just bear in mind that this is a _separate_ number, different from the NPM package
  // > version.  sails-hook-orm verifies this adapter API version when loading adapters to ensure
  // > compatibility, so you should be able to rely on it to provide a good error message to the Sails
  // > applications which use this adapter.
  adapterApiVersion: 1,


  // Default datastore configuration.
  defaults: {
    schema: false,
  },


  //  ╔═╗═╗ ╦╔═╗╔═╗╔═╗╔═╗  ┌─┐┬─┐┬┬  ┬┌─┐┌┬┐┌─┐
  //  ║╣ ╔╩╦╝╠═╝║ ║╚═╗║╣   ├─┘├┬┘│└┐┌┘├─┤ │ ├┤
  //  ╚═╝╩ ╚═╩  ╚═╝╚═╝╚═╝  ┴  ┴└─┴ └┘ ┴ ┴ ┴ └─┘
  //  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐┌─┐
  //   ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤ └─┐
  //  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘└─┘
  // This allows outside access to this adapter's internal registry of datastore entries,
  // for use in datastore methods like `.leaseConnection()`.
  datastores: registeredDsEntries,



  //////////////////////////////////////////////////////////////////////////////////////////////////
  //  ██╗     ██╗███████╗███████╗ ██████╗██╗   ██╗ ██████╗██╗     ███████╗                        //
  //  ██║     ██║██╔════╝██╔════╝██╔════╝╚██╗ ██╔╝██╔════╝██║     ██╔════╝                        //
  //  ██║     ██║█████╗  █████╗  ██║      ╚████╔╝ ██║     ██║     █████╗                          //
  //  ██║     ██║██╔══╝  ██╔══╝  ██║       ╚██╔╝  ██║     ██║     ██╔══╝                          //
  //  ███████╗██║██║     ███████╗╚██████╗   ██║   ╚██████╗███████╗███████╗                        //
  //  ╚══════╝╚═╝╚═╝     ╚══════╝ ╚═════╝   ╚═╝    ╚═════╝╚══════╝╚══════╝                        //
  //                                                                                              //
  // Lifecycle adapter methods:                                                                   //
  // Methods related to setting up and tearing down; registering/un-registering datastores.       //
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   *  ╦═╗╔═╗╔═╗╦╔═╗╔╦╗╔═╗╦═╗  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐
   *  ╠╦╝║╣ ║ ╦║╚═╗ ║ ║╣ ╠╦╝   ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤
   *  ╩╚═╚═╝╚═╝╩╚═╝ ╩ ╚═╝╩╚═  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘
   *   ˙     ˙     ˙     ˙     ˙     ˙     ˙     ˙     ˙     ˙     ˙     ˙     ˙     ˙
   * Register a new datastore with this adapter.  This usually involves creating a new
   * connection manager (e.g. MongoDB client `db`) for the underlying database layer.
   *
   * > Waterline calls this method once for every datastore that is configured to use this adapter.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   dsConfig              »-> Dictionary (plain JavaScript object) of configuration options for this datastore (e.g. host, port, etc.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   physicalModelsReport  »–> Experimental: The physical models using this datastore (keyed by "tableName"-- NOT by `identity`!).  This may change in a future release of the adapter spec.
   *         ˚¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯\
   *         ˙ **: {Dictionary}   :: Info about a physical model using this datastore.  WARNING: This is in a bit of an unusual format.
   *               ˚¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯\
   *               ˙ primaryKey: {String}      :: The name of the primary key attribute (NOT the column name-- the attribute name!)]
   *               ˙ identity: {String}        :: The model's `identity`.
   *               ˙ tableName: {String}       :: The model's `tableName` (same as the key this is under, just here for convenience)]
   *               ˙ definition: {Dictionary}  :: The physical-layer report from waterline-schema.  NOTE THAT THIS IS NOT A NORMAL MODEL DEF! It's more similar to `attributes`, but not even that, really.
   *                             ˚¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯\
   *                             ˙ **: {Dictionary}  :: Info about an attribute.
   *                                   ˚¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯\
   *                                   ˙ columnName: {String}  ::
   *                                   ˙ required: {Boolean?}  ::
   *                                   ˙ etc...
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}  done    »-> A callback function which should be triggered by this implementation after successfully registering this datastore, or if an error is encountered.
   *         @param {Error?} err   <-« An Error instance, if something went wrong.  (Otherwise `undefined`.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  registerDatastore: function (dsConfig, physicalModelsReport, done) {

    // Grab the unique name for this datastore for easy access below.
    var datastoreName = dsConfig.identity;

    // Some sanity checks:
    if (!datastoreName) {
      return done(new Error('Consistency violation: A datastore should contain an "identity" property: a special identifier that uniquely identifies it across this app.  This should have been provided by Waterline core!  If you are seeing this message, there could be a bug in Waterline, or the datastore could have become corrupted by userland code, or other code in this adapter.  If you determine that this is a Waterline bug, please report this at http://sailsjs.com/bugs.'));
    }
    if (registeredDsEntries[datastoreName]) {
      return done(new Error('Consistency violation: Cannot register datastore: `' + datastoreName + '`, because it is already registered with this adapter!  This could be due to an unexpected race condition in userland code (e.g. attempting to initialize Waterline more than once), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }


    //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐
    //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣    ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤   │  │ ││││├┤ ││ ┬
    //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘  └─┘└─┘┘└┘└  ┴└─┘
    try {
      normalizeDatastoreConfig(dsConfig);
    } catch (e) {
      switch (e.code) {
        case 'E_BAD_CONFIG': return done(flaverr(e.code, new Error('Invalid configuration for datastore `' + datastoreName + '`:  '+e.message)));
        default: return done(e);
      }
    }


    //  ╔═╗╔═╗╦═╗╔╦╗╦╔═╗╦ ╦  ┌─┐┌─┐┌─┐┬┌┐┌┌─┐┌┬┐  ┌┬┐┌┐    ┌─┐┌─┐┌─┐┌─┐┬┌─┐┬┌─┐
    //  ║  ║╣ ╠╦╝ ║ ║╠╣ ╚╦╝  ├─┤│ ┬├─┤││││└─┐ │    ││├┴┐───└─┐├─┘├┤ │  │├┤ ││
    //  ╚═╝╚═╝╩╚═ ╩ ╩╚   ╩   ┴ ┴└─┘┴ ┴┴┘└┘└─┘ ┴   ─┴┘└─┘   └─┘┴  └─┘└─┘┴└  ┴└─┘┘
    //  ┌─┐┌┐┌┌┬┐┌─┐┬  ┌─┐┌─┐┬┌─┐┌─┐┬    ┬─┐┌─┐┌─┐┌┬┐┬─┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  │ ││││ │ │ ││  │ ││ ┬││  ├─┤│    ├┬┘├┤ └─┐ │ ├┬┘││   │ ││ ││││└─┐
    //  └─┘┘└┘ ┴ └─┘┴─┘└─┘└─┘┴└─┘┴ ┴┴─┘  ┴└─└─┘└─┘ ┴ ┴└─┴└─┘ ┴ ┴└─┘┘└┘└─┘
    // n/a


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┌─┐┬─┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   │││├─┤│││├─┤│ ┬├┤ ├┬┘
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ┴ ┴┴ ┴┘└┘┴ ┴└─┘└─┘┴└─
    // Build a "connection manager" -- an object that contains all of the state for this datastore.
    // This might be a MySQL connection pool, a Mongo client instance (`db`), or something even simpler.
    // For example, in sails-postgresql, `manager` encapsulates a connection pool that the stateless
    // `machinepack-postgresql` driver uses to communicate with the database.  The actual form of the
    // manager is completely dependent on this adapter.  In other words, it is custom and database-specific.
    // This is where you should store any custom metadata specific to this datastore.
    WLDriver.createManager({
      connectionString: dsConfig.url,
      meta: dsConfig
    }, {
      error: function(err) { return done(err); },
      malformed: function(report) {
        var err = new Error('The given connection URL is not valid for this database.  Details:\n```\n'+report.error.stack+'\n```');
        err.raw = report.error;
        if (report.meta) { err.meta = report.meta; }
        return done(err);
      },
      failed: function(report) {
        var err = new Error('Failed to connect with the given datastore configuration.  Details:\n```\n'+report.error.stack+'\n```');
        err.raw = report.error;
        if (report.meta) { err.meta = report.meta; }
        return done(err);
      },
      success: function (report) {
        try {

          var manager = report.manager;

          //  ╔╦╗╦═╗╔═╗╔═╗╦╔═  ┌┬┐┌─┐  ┌─┐┌┐┌┌┬┐┬─┐┬ ┬
          //   ║ ╠╦╝╠═╣║  ╠╩╗   ││└─┐  ├┤ │││ │ ├┬┘└┬┘
          //   ╩ ╩╚═╩ ╩╚═╝╩ ╩  ─┴┘└─┘  └─┘┘└┘ ┴ ┴└─ ┴
          //  ┌─  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐  ┌─┐┌┐┌┌┬┐┬─┐┬ ┬  ─┐
          //  │    ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤   ├┤ │││ │ ├┬┘└┬┘   │
          //  └─  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘  └─┘┘└┘ ┴ ┴└─ ┴   ─┘
          // Save information about the datastore to the `datastores` dictionary, keyed under
          // the datastore's unique name.  The information should itself be in the form of a
          // dictionary (plain JavaScript object), and have three keys:
          //
          // `manager`: The database-specific "connection manager" that we just built above.
          //
          // `config  : Configuration options for the datastore.  Should be passed straight through
          //            from what was provided as the `dsConfig` argument to this method.
          //
          // `driver` : Optional.  A reference to a stateless, underlying Node-Machine driver.
          //            (For instance `machinepack-postgresql` for the `sails-postgresql` adapter.)
          //            Note that this stateless, standardized driver will be merged into the main
          //            concept of an adapter in future versions of the Waterline adapter spec.
          //            (See https://github.com/node-machine/driver-interface for more informaiton.)
          //
          registeredDsEntries[datastoreName] = {
            config: dsConfig,
            manager: manager,
            driver: WLDriver,
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            // ^Note: In future releases, the driver and the adapter will simply become one thing.
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          };


          //  ╔╦╗╦═╗╔═╗╔═╗╦╔═  ┌─┐┬ ┬  ┌┬┐┌─┐┌┬┐┌─┐┬  ┌─┐
          //   ║ ╠╦╝╠═╣║  ╠╩╗  ├─┘├─┤  ││││ │ ││├┤ │  └─┐
          //   ╩ ╩╚═╩ ╩╚═╝╩ ╩  ┴  ┴ ┴  ┴ ┴└─┘─┴┘└─┘┴─┘└─┘
          // Also track physical models.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: Remove the need for this step by giving the adapter some kind of simpler access
          // to the orm instance, or an accessor function for models.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          _.each(physicalModelsReport, function(phModelInfo){

            // console.log('in datastore: `%s`  ……tracking physical model:  `%s` (tableName: `%s`)',datastoreName, phModelInfo.identity, phModelInfo.tableName);

            registeredPhModels[phModelInfo.identity] = {
              primaryKey: phModelInfo.primaryKey,
              attributes: phModelInfo.definition,
              tableName: phModelInfo.tableName,
              identity: phModelInfo.identity,
            };

            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            // console.log('\n\nphModelInfo:',util.inspect(phModelInfo,{depth:5}));
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            // { primaryKey: 'id',
            //   definition:
            //    { id:
            //       { type: 'string',
            //         columnName: '_id',
            //         autoMigrations: { columnType: '_integer_etc', autoIncrement: true, unique: true } },
            //      firstName:
            //       { type: 'string',
            //         autoMigrations: { columnType: '_varchar_etc' },
            //         columnName: 'first_name' },
            //      lastName:
            //       { type: 'string',
            //         autoMigrations: { columnType: '_varchar_etc' },
            //         columnName: 'last_name' },
            //      type:
            //       { type: 'string',
            //         autoMigrations: { columnType: '_varchar_etc' },
            //         columnName: 'type' },
            //      age:
            //       { type: 'number',
            //         autoMigrations: { columnType: '_integer_etc' },
            //         validations: { min: 0, max: 140 },
            //         columnName: 'age' },
            //      obj:
            //       { type: 'json',
            //         autoMigrations: { columnType: '_json_etc' },
            //         columnName: 'obj' },
            //      status:
            //       { type: 'boolean',
            //         autoMigrations: { columnType: '_boolean_etc' },
            //         columnName: 'status' },
            //      avatar:
            //       { type: 'ref',
            //         autoMigrations: { columnType: '_text_etc' },
            //         columnName: 'avatar' },
            //      sort:
            //       { type: 'json',
            //         autoMigrations: { columnType: '_json_etc' },
            //         columnName: 'sort' },
            //      updatedAt:
            //       { type: 'number',
            //         autoUpdatedAt: true,
            //         autoMigrations: { columnType: '_bigint_etc' },
            //         columnName: 'updatedAt' },
            //      createdAt:
            //       { type: 'number',
            //         autoCreatedAt: true,
            //         autoMigrations: { columnType: '_bigint_etc' },
            //         columnName: 'createdAt' } },
            //   tableName: 'userTable',
            //   identity: 'user' }
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

          });//</each phModel>

        } catch (e) { return done(e); }

        // Inform Waterline that the datastore was registered successfully.
        return done(undefined, report.meta);

      }//•-success>
    });//createManager()>

  },


  /**
   *  ╔╦╗╔═╗╔═╗╦═╗╔╦╗╔═╗╦ ╦╔╗╔
   *   ║ ║╣ ╠═╣╠╦╝ ║║║ ║║║║║║║
   *   ╩ ╚═╝╩ ╩╩╚══╩╝╚═╝╚╩╝╝╚╝
   * Tear down (un-register) a datastore.
   *
   * Fired when a datastore is unregistered.  Typically called once for
   * each relevant datastore when the server is killed, or when Waterline
   * is shut down after a series of tests.  Useful for destroying the manager
   * (i.e. terminating any remaining open connections, etc.).
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String} datastoreName   The unique name (identity) of the datastore to un-register.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function} done          Callback
   *               @param {Error?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  teardown: function (datastoreName, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity checks:
    if (!datastoreName) {
      return done(new Error('Consistency violation: Internal error in Waterline: Adapter received unexpected falsey datastore name (`'+datastoreName+'`)!  Can\'t look up a DS entry from this adapter with that...  (Please report this error at http://sailsjs.com/bugs.)'));
    }
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Attempting to tear down a datastore (`'+datastoreName+'`) which is not currently registered with this adapter.  This is usually due to a race condition in userland code (e.g. attempting to tear down the same ORM instance more than once), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }
    if (!dsEntry.manager) {
      return done(new Error('Consistency violation: Missing manager for this datastore. (This datastore may already be in the process of being destroyed.)'));
    }

    //  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┌─┐┬─┐
    //   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝  │││├─┤│││├─┤│ ┬├┤ ├┬┘
    //  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩   ┴ ┴┴ ┴┘└┘┴ ┴└─┘└─┘┴└─
    // Destroy the manager.
    WLDriver.destroyManager({ manager: dsEntry.manager }, {
      error: function(err) { return done(new Error('Encountered unexpected error when attempting to destroy the connection manager.\n\n```\n'+err.stack+'\n```')); },
      failed: function(report) {
        var err = new Error('Datastore (`'+datastoreName+'`) could not be torn down because of a failure when attempting to destroy the connection manager.\n\n```\n'+report.error.stack+'\n```');
        err.raw = report.error;
        if (report.meta) { err.meta = report.meta; }
        return done(err);
      },
      success: function (report) {

        //  ╦ ╦╔╗╔  ╔╦╗╦═╗╔═╗╔═╗╦╔═  ┌┬┐┌─┐  ┌─┐┌┐┌┌┬┐┬─┐┬ ┬
        //  ║ ║║║║───║ ╠╦╝╠═╣║  ╠╩╗   ││└─┐  ├┤ │││ │ ├┬┘└┬┘
        //  ╚═╝╝╚╝   ╩ ╩╚═╩ ╩╚═╝╩ ╩  ─┴┘└─┘  └─┘┘└┘ ┴ ┴└─ ┴
        //  ┌─  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐  ┌─┐┌┐┌┌┬┐┬─┐┬ ┬  ─┐
        //  │    ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤   ├┤ │││ │ ├┬┘└┬┘   │
        //  └─  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘  └─┘┘└┘ ┴ ┴└─ ┴   ─┘
        // Now, un-register the datastore, as well as any registered physical model
        // definitions that use it.
        try {
          delete registeredDsEntries[datastoreName];

          _.each(_.keys(registeredPhModels), function(modelIdentity) {
            if (registeredPhModels[modelIdentity].datastore === datastoreName) {
              delete registeredPhModels[modelIdentity];
            }
          });

        } catch (e) { return done(e); }

        // Inform Waterline that we're done, and that everything went as expected.
        return done(undefined, report.meta);

      }//•-success>
    });//destroyManager()>

  },


  //////////////////////////////////////////////////////////////////////////////////////////////////
  //  ██████╗ ███╗   ███╗██╗                                                                      //
  //  ██╔══██╗████╗ ████║██║                                                                      //
  //  ██║  ██║██╔████╔██║██║                                                                      //
  //  ██║  ██║██║╚██╔╝██║██║                                                                      //
  //  ██████╔╝██║ ╚═╝ ██║███████╗                                                                 //
  //  ╚═════╝ ╚═╝     ╚═╝╚══════╝                                                                 //
  // (D)ata (M)anipulation (L)anguage                                                             //
  //                                                                                              //
  // DML adapter methods:                                                                         //
  // Methods related to manipulating records stored in the database.                              //
  //////////////////////////////////////////////////////////////////////////////////////////////////


  /**
   *  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗
   *  ║  ╠╦╝║╣ ╠═╣ ║ ║╣
   *  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝
   * Create a new record.
   *
   * (e.g. add a new row to a SQL table, or a new document to a MongoDB collection.)
   *
   * > Note that depending on the value of `s3q.meta.fetch`,
   * > you may be expected to return the physical record that was
   * > created (a dictionary) as the second argument to the callback.
   * > (Otherwise, exclude the 2nd argument or send back `undefined`.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore to perform the query on.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   s3q             The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Dictionary?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  create: function (datastoreName, s3q, done, meta) {

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
      connection: (meta && meta.leasedConnection) || undefined,
      meta: meta,
      during: function (connection, proceed) {

        // Perform the query (and if relevant, send back a result.)
        helpCreate({
          query: s3q,
          connection: connection,
          models: registeredPhModels,
          meta: meta
        }).exec({
          error: function (err) { return proceed(err); },
          notUnique: function (err) { return proceed(err); },//<< `footprint` is already attached
          success: function (report) {
            // (`report.meta` is ignored)

            // > Note: we use this `if` statement because, if `report.record` was undefined,
            // > it will have been coerced to null-- but we want it to be `undefined` still,
            // > for consistency.
            if (!report.record) { return proceed(); }
            return proceed(undefined, report.record);
          }
        });

      }//</:during>
    }, done);//</doWithConnection()>

  },


  /**
   *  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ╔═╗╔═╗╔═╗╦ ╦
   *  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   ║╣ ╠═╣║  ╠═╣
   *  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ╚═╝╩ ╩╚═╝╩ ╩
   * Create multiple new records.
   *
   * > Note that depending on the value of `query.meta.fetch`,
   * > you may be expected to return the array of physical records
   * > that were created as the second argument to the callback.
   * > (Otherwise, exclude the 2nd argument or send back `undefined`.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore to perform the query on.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   query           The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Array?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  createEach: function (datastoreName, query, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Perform the query (and if relevant, send back a result.)
    //
    // > TODO: Replace this setTimeout with real logic that calls
    // > `done()` when finished. (Or remove this method from the
    // > adapter altogether
    setTimeout(function(){
      return done(new Error('Adapter method (`createEach`) not implemented yet.'));
    }, 16);

  },



  /**
   *  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗
   *  ║ ║╠═╝ ║║╠═╣ ║ ║╣
   *  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝
   * Update matching records.
   *
   * > Note that depending on the value of `query.meta.fetch`,
   * > you may be expected to return the array of physical records
   * > that were updated as the second argument to the callback.
   * > (Otherwise, exclude the 2nd argument or send back `undefined`.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore to perform the query on.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   query           The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Array?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  update: function (datastoreName, query, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Perform the query (and if relevant, send back a result.)
    //
    // > TODO: Replace this setTimeout with real logic that calls
    // > `done()` when finished. (Or remove this method from the
    // > adapter altogether
    setTimeout(function(){
      return done(new Error('Adapter method (`update`) not implemented yet.'));
    }, 16);

  },


  /**
   *  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦
   *   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝
   *  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩
   * Destroy one or more records.
   *
   * > Note that depending on the value of `query.meta.fetch`,
   * > you may be expected to return the array of physical records
   * > that were destroyed as the second argument to the callback.
   * > (Otherwise, exclude the 2nd argument or send back `undefined`.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore to perform the query on.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   query           The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Array?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  destroy: function (datastoreName, query, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Perform the query (and if relevant, send back a result.)
    //
    // > TODO: Replace this setTimeout with real logic that calls
    // > `done()` when finished. (Or remove this method from the
    // > adapter altogether
    setTimeout(function(){
      return done(new Error('Adapter method (`destroy`) not implemented yet.'));
    }, 16);

  },



  //////////////////////////////////////////////////////////////////////////////////////////////////
  //  ██████╗  ██████╗ ██╗                                                                        //
  //  ██╔══██╗██╔═══██╗██║                                                                        //
  //  ██║  ██║██║   ██║██║                                                                        //
  //  ██║  ██║██║▄▄ ██║██║                                                                        //
  //  ██████╔╝╚██████╔╝███████╗                                                                   //
  //  ╚═════╝  ╚══▀▀═╝ ╚══════╝                                                                   //
  // (D)ata (Q)uery (L)anguage                                                                    //
  //                                                                                              //
  // DQL adapter methods:                                                                         //
  // Methods related to fetching information from the database (e.g. finding stored records).     //
  //////////////////////////////////////////////////////////////////////////////////////////////////


  /**
   *  ╔═╗╦╔╗╔╔╦╗
   *  ╠╣ ║║║║ ║║
   *  ╚  ╩╝╚╝═╩╝
   * Find matching records.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore to perform the query on.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   query           The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Array}  [matching physical records]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  find: function (datastoreName, query, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Perform the query and send back a result.
    //
    // > TODO: Replace this setTimeout with real logic that calls
    // > `done()` when finished. (Or remove this method from the
    // > adapter altogether
    setTimeout(function(){
      return done(new Error('Adapter method (`find`) not implemented yet.'));
    }, 16);

  },


  /**
   *   ╦╔═╗╦╔╗╔
   *   ║║ ║║║║║
   *  ╚╝╚═╝╩╝╚╝
   *  ┌─    ┌─┐┌─┐┬─┐  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐  ┌─┐┌─┐┌─┐┬ ┬┬  ┌─┐┌┬┐┌─┐    ─┐
   *  │───  ├┤ │ │├┬┘  │││├─┤ │ │└┐┌┘├┤   ├─┘│ │├─┘│ ││  ├─┤ │ ├┤   ───│
   *  └─    └  └─┘┴└─  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  ┴  └─┘┴  └─┘┴─┘┴ ┴ ┴ └─┘    ─┘
   * Perform a "find" query with one or more native joins.
   *
   * > NOTE: If you don't want to support native joins (or if your database does not
   * > support native joins, e.g. Mongo) remove this method completely!  Without this method,
   * > Waterline will handle `.populate()` using its built-in join polyfill (aka "polypopulate"),
   * > which sends multiple queries to the adapter and joins the results in-memory.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore to perform the query on.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   query           The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Array}  [matching physical records, populated according to the join instructions]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // -----------------------------------------------------
  // N/A
  // (sails-mongo does not implement an optimized `join`
  // method for use with .populate() -- thus the built-in
  // populate polyfill, "polypopulate", will be used
  // instead.)
  // -----------------------------------------------------


  /**
   *  ╔═╗╔═╗╦ ╦╔╗╔╔╦╗
   *  ║  ║ ║║ ║║║║ ║
   *  ╚═╝╚═╝╚═╝╝╚╝ ╩
   * Get the number of matching records.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore to perform the query on.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   query           The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Number}  [the number of matching records]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  count: function (datastoreName, query, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Perform the query and send back a result.
    //
    // > TODO: Replace this setTimeout with real logic that calls
    // > `done()` when finished. (Or remove this method from the
    // > adapter altogether
    setTimeout(function(){
      return done(new Error('Adapter method (`count`) not implemented yet.'));
    }, 16);

  },


  /**
   *  ╔═╗╦ ╦╔╦╗
   *  ╚═╗║ ║║║║
   *  ╚═╝╚═╝╩ ╩
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore to perform the query on.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   query           The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Number}  [the sum]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  sum: function (datastoreName, query, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Perform the query and send back a result.
    //
    // > TODO: Replace this setTimeout with real logic that calls
    // > `done()` when finished. (Or remove this method from the
    // > adapter altogether
    setTimeout(function(){
      return done(new Error('Adapter method (`sum`) not implemented yet.'));
    }, 16);

  },


  /**
   *  ╔═╗╦  ╦╔═╗
   *  ╠═╣╚╗╔╝║ ╦
   *  ╩ ╩ ╚╝ ╚═╝
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore to perform the query on.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   query           The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Number}  [the average ("mean")]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  avg: function (datastoreName, query, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Perform the query and send back a result.
    //
    // > TODO: Replace this setTimeout with real logic that calls
    // > `done()` when finished. (Or remove this method from the
    // > adapter altogether
    setTimeout(function(){
      return done(new Error('Adapter method (`avg`) not implemented yet.'));
    }, 16);

  },



  //////////////////////////////////////////////////////////////////////////////////////////////////
  //  ██████╗ ██████╗ ██╗                                                                         //
  //  ██╔══██╗██╔══██╗██║                                                                         //
  //  ██║  ██║██║  ██║██║                                                                         //
  //  ██║  ██║██║  ██║██║                                                                         //
  //  ██████╔╝██████╔╝███████╗                                                                    //
  //  ╚═════╝ ╚═════╝ ╚══════╝                                                                    //
  // (D)ata (D)efinition (L)anguage                                                               //
  //                                                                                              //
  // DDL adapter methods:                                                                         //
  // Methods related to modifying the underlying structure of physical models in the database.    //
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   *  ╔╦╗╔═╗╔═╗╦╔╗╔╔═╗
   *   ║║║╣ ╠╣ ║║║║║╣
   *  ═╩╝╚═╝╚  ╩╝╚╝╚═╝
   * Build a new physical model (e.g. table/etc) to use for storing records in the database.
   *
   * (This is used for schema migrations.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore containing the table to create.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       tableName       The name of the table to create.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Dictionary}   phmDef          The physical model definition (not a normal Sails/Waterline model-- log this for details.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  define: function (datastoreName, tableName, phmDef, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }


    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // NOTE:
    // In Mongo, we don't really have to do anything special to define the actual,
    // concrete physical model, per se.  But we do have to set up special indexes
    // to ensure uniqueness.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Build an array of any UNIQUE indexes needed
    // > Go through each item in the definition to locate fields
    // > which demand a uniqueness constraint.
    var uniqueIndexesToCreate = [];
    _.each(phmDef, function (phmAttrDef, key) {
      if (_.has(phmAttrDef, 'unique') && phmAttrDef.unique) {
        uniqueIndexesToCreate.push(key);
      }
    });

    // "Clean" the list of unique indexes.
    // > Remove `_id`.
    _.remove(uniqueIndexesToCreate, function (val) {
      return val === '_id';
    });

    // If there are no indexes to create, bail out (we're done).
    if (uniqueIndexesToCreate.length === 0) {
      return done();
    }//-•
    // Otherwise we'll need to create some indexes....

    // First, get a reference to the Mongo collection.
    var db = dsEntry.manager;
    var mongoCollection = db.collection(tableName);

    // Then simultaneously create all of the indexes:
    async.each(uniqueIndexesToCreate, function (key, next) {

      // Build up a special "keys" dictionary for Mongo.
      // (e.g. `{foo:1}`)
      //
      // > This is the definition for a "single-field index".
      // > (https://docs.mongodb.com/manual/indexes/#index-types)
      var mongoSingleFieldIdxKeys = {};
      mongoSingleFieldIdxKeys[key] = 1;
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // ^^^NOTE:
      //
      // There's a one-liner for this (https://lodash.com/docs/3.10.1#zipObject).
      // Avoiding it for clarity, but just making note of the reason why.
      // Here's what it would look like, for reference:
      // ```
      // var mongoSingleFieldIdxKeys = _.zipObject([[key, 1]]);
      // ```
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


      // Create the index on the Mongo collection.
      // (https://docs.mongodb.com/manual/reference/method/db.collection.createIndex)
      mongoCollection.createIndex(mongoSingleFieldIdxKeys, { unique: true }, function (err) {
        if (err && !_.isError(err)) {
          err = flaverr({raw: err}, new Error('Consistency violation: Expecting Error instance, but instead got: '+util.inspect(err)));
          return next(err);
        }
        else if (err) { return next(err); }
        else { return next(); }
      });//</ db.collection(...).createIndex() >

    }, function (err) {
      if (err) { return done(err); }
      return done();
    });//</ async.each >

  },


  /**
   *  ╔╦╗╦═╗╔═╗╔═╗
   *   ║║╠╦╝║ ║╠═╝
   *  ═╩╝╩╚═╚═╝╩
   * Drop a physical model (table/etc.) from the database, including all of its records.
   *
   * > This is idempotent.
   *
   * (This is used for schema migrations.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore containing the table to drop.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       tableName       The name of the table to drop.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Ref}          unused          Currently unused (do not use this argument.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  drop: function (datastoreName, tableName, unused, done) {

    // Look up the datastore entry (manager/driver/config).
    var dsEntry = registeredDsEntries[datastoreName];

    // Sanity check:
    if (_.isUndefined(dsEntry)) {
      return done(new Error('Consistency violation: Cannot do that with datastore (`'+datastoreName+'`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at http://sailsjs.com/support.)'));
    }

    // Drop the physical model (e.g. table/etc.)
    var db = dsEntry.manager;
    db.collection(tableName).drop(function (err) {
      try {

        if (err) {
          if (err.errmsg === 'ns not found') {
            throw flaverr('E_PHM_NOT_FOUND', new Error('No such physical model is currently defined.'));
          }
          else if (_.isError(err)) { throw err; }
          else { throw new Error('Consistency violation: Expecting Error instance, but instead got: '+util.inspect(err)); }
        }//>-

      } catch (e) {
        switch (e.code) {
          case 'E_PHM_NOT_FOUND': break;
          default:
            e.raw = err;
            return done(e);
        }
      }//</catch>

      // >-•
      // IWMIH, then either the physical model was successfully dropped,
      // or it didn't exist in the first place.
      return done();
    });//</db.collection(...).drop()>

  },


  /**
   *  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌─┐ ┬ ┬┌─┐┌┐┌┌─┐┌─┐
   *  ╚═╗║╣  ║   └─┐├┤ │─┼┐│ │├┤ ││││  ├┤
   *  ╚═╝╚═╝ ╩   └─┘└─┘└─┘└└─┘└─┘┘└┘└─┘└─┘
   * Set a sequence in a physical model (specifically, the auto-incrementing
   * counter for the primary key) to the specified value.
   *
   * (This is used for schema migrations.)
   *
   * > NOTE - If your adapter doesn't support sequence entities (like PostgreSQL),
   * > you should remove this method.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName    The name of the datastore containing the table/etc.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       sequenceName     The name of the sequence to update.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Number}       sequenceValue    The new value for the sequence (e.g. 1)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done             Callback
   *               @param {Error?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */

  // -----------------------------------------------------
  // N/A
  // (sails-mongo does not currently implement setSequence.)
  // -----------------------------------------------------


};
