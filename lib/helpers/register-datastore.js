//  ██████╗ ███████╗ ██████╗ ██╗███████╗████████╗███████╗██████╗
//  ██╔══██╗██╔════╝██╔════╝ ██║██╔════╝╚══██╔══╝██╔════╝██╔══██╗
//  ██████╔╝█████╗  ██║  ███╗██║███████╗   ██║   █████╗  ██████╔╝
//  ██╔══██╗██╔══╝  ██║   ██║██║╚════██║   ██║   ██╔══╝  ██╔══██╗
//  ██║  ██║███████╗╚██████╔╝██║███████║   ██║   ███████╗██║  ██║
//  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
//
//  ██████╗  █████╗ ████████╗ █████╗     ███████╗████████╗ ██████╗ ██████╗ ███████╗
//  ██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗    ██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██╔════╝
//  ██║  ██║███████║   ██║   ███████║    ███████╗   ██║   ██║   ██║██████╔╝█████╗
//  ██║  ██║██╔══██║   ██║   ██╔══██║    ╚════██║   ██║   ██║   ██║██╔══██╗██╔══╝
//  ██████╔╝██║  ██║   ██║   ██║  ██║    ███████║   ██║   ╚██████╔╝██║  ██║███████╗
//  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝    ╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// FUTURE: Pull this into Waterline core.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

module.exports = require('machine').build({


  friendlyName: 'Register datastore',


  description: 'Register a new datastore for making connections.',


  inputs: {

    identity: {
      description: 'A unique identitifer for the datastore.',
      example: 'default',
      required: true
    },

    config: {
      description: 'A dictionary of configuration to use for this datastore.',
      required: true,
      example: '==='
    },

    models: {
      description: 'The Waterline models that will be used with this datastore.',
      required: true,
      example: '==='
    },

    datastores: {
      description: 'A reference to the dictionary containing all of the datastores that have been registered with this adapter.',
      extendedDescription: 'This will be mutated in place!',
      required: true,
      example: '==='
    },

    modelDefinitions: {
      description: 'A reference to the dictionary containing all of the model definitions that have been registered with this adapter.',
      extendedDescription: 'This will be mutated in place!',
      required: true,
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The datastore was registered successfully.',
      outputFriendlyName: 'Meta (maybe)',
      outputExample: '==='
    },

    badConfiguration: {
      description: 'The configuration was invalid.',
      outputFriendlyName: 'Error',
      outputExample: '==='
    }

  },


  fn: function registerDatastore(inputs, exits) {
    // Dependencies
    var _ = require('@sailshq/lodash');
    var WLDriver = require('machinepack-mongo');

    // Validate that the datastore isn't already initialized
    if (inputs.datastores[inputs.identity]) {
      return exits.badConfiguration(new Error('Connection config is already registered.'));
    }

    //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐
    //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │  │ ││││├┤ ││ ┬
    //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘└─┘┘└┘└  ┴└─┘
    // If a URL config value was not given, ensure that all the various pieces
    // needed to create one exist.
    var hasURL = _.has(inputs.config, 'url');

    // Validate that the connection has a host and database property
    if (!hasURL && !inputs.config.host) {
      return exits.badConfiguration(new Error('Connection config is missing a host value.'));
    }

    if (!hasURL && !inputs.config.database) {
      return exits.badConfiguration(new Error('Connection config is missing a database value.'));
    }


    //  ╔═╗╔═╗╔╗╔╔═╗╦═╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ║ ╦║╣ ║║║║╣ ╠╦╝╠═╣ ║ ║╣   │  │ │││││││├┤ │   │ ││ ││││
    //  ╚═╝╚═╝╝╚╝╚═╝╩╚═╩ ╩ ╩ ╚═╝  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘
    //  ┌─┐┌┬┐┬─┐┬┌┐┌┌─┐  ┬ ┬┬─┐┬
    //  └─┐ │ ├┬┘│││││ ┬  │ │├┬┘│
    //  └─┘ ┴ ┴└─┴┘└┘└─┘  └─┘┴└─┴─┘
    // If the connection details were not supplied as a URL, make them into one.
    // This is required for the underlying driver in use.
    if (!hasURL) {
      var url = 'mongodb://';
      var port = inputs.config.port || '27017';

      // If authentication is used, add it to the connection string
      if (inputs.config.user && inputs.config.password) {
        url += inputs.config.user + ':' + inputs.config.password + '@';
      }

      url += inputs.config.host + ':' + port + '/' + inputs.config.database;
      inputs.config.url = url;
    }


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┌─┐┬─┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   │││├─┤│││├─┤│ ┬├┤ ├┬┘
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ┴ ┴┴ ┴┘└┘┴ ┴└─┘└─┘┴└─
    WLDriver.createManager({
      connectionString: inputs.config.url,
      meta: inputs.config
    }, {
      error: function(err) { return exits.error(err); },
      malformed: function(report) {
        if (report.meta) { report.error.meta = report.meta; }
        return exits.badConfiguration(report.error);
      },
      failed: function(report) {
        var err = new Error('Could not connect to Mongo with the given datastore configuration.  Details: '+report.error.stack);
        if (report.meta) { err.meta = report.meta; }
        return exits.error(err);
      },
      success: function (report) {
        try {

          // Build up a database schema for this connection that can be used
          // throughout the adapter
          var dbSchema = {};

          _.each(inputs.models, function eachModel(model) {
            var identity = model.identity;
            var tableName = model.tableName;
            var definition = model.definition;

            dbSchema[tableName] = {
              identity: identity,
              tableName: tableName,
              definition: definition,
              primaryKey: model.primaryKey
            };
          });

          // Store the datastore
          inputs.datastores[inputs.identity] = {
            manager: report.manager,
            config: inputs.config,
            driver: WLDriver
          };

          // Store the entire db schema for the model
          // (TODO: why?)
          inputs.modelDefinitions[inputs.identity] = dbSchema;

        } catch (e) { return exits.error(e); }

        return exits.success(report.meta);

      }//•-success>
    });//createManager()>
  }
});
