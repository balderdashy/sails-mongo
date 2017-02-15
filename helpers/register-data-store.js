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

module.exports = require('machine').build({


  friendlyName: 'Register Data Store',


  description: 'Register a new datastore for making connections.',


  inputs: {

    identity: {
      description: 'A unique identitifer for the connection.',
      example: 'localPostgres',
      required: true
    },

    config: {
      description: 'The configuration to use for the data store.',
      required: true,
      example: '==='
    },

    models: {
      description: 'The Waterline models that will be used with this data store.',
      required: true,
      example: '==='
    },

    datastores: {
      description: 'An object containing all of the data stores that have been registered.',
      required: true,
      example: '==='
    },

    modelDefinitions: {
      description: 'An object containing all of the model definitions that have been registered.',
      required: true,
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The data store was initialized successfully.'
    },

    badConfiguration: {
      description: 'The configuration was invalid.',
      outputExample: '==='
    }

  },


  fn: function registerDataStore(inputs, exits) {
    // Dependencies
    var _ = require('@sailshq/lodash');
    var Mongo = require('machinepack-mongo');
    var Helpers = require('./private');

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
    if (!_.has(inputs.config, 'url')) {
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
    Helpers.connection.createManager(inputs.config.url, inputs.config, function createManagerCb(err, report) {
      if (err) {
        return exits.error(err);
      }

      // Build up a database schema for this connection that can be used
      // throughout the adapter
      var dbSchema = {};

      _.each(inputs.models, function buildSchema(val) {
        var identity = val.identity;
        var tableName = val.tableName;
        var definition = val.definition;

        dbSchema[tableName] = {
          identity: identity,
          tableName: tableName,
          definition: definition,
          primaryKey: val.primaryKey
        };
      });

      // Store the connection
      inputs.datastores[inputs.identity] = {
        manager: report.manager,
        config: inputs.config,
        driver: Mongo
      };

      // Store the db schema for the connection
      inputs.modelDefinitions[inputs.identity] = dbSchema;

      return exits.success();
    });
  }
});
