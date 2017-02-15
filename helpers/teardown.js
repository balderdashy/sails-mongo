//  ████████╗███████╗ █████╗ ██████╗ ██████╗  ██████╗ ██╗    ██╗███╗   ██╗
//  ╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██║    ██║████╗  ██║
//     ██║   █████╗  ███████║██████╔╝██║  ██║██║   ██║██║ █╗ ██║██╔██╗ ██║
//     ██║   ██╔══╝  ██╔══██║██╔══██╗██║  ██║██║   ██║██║███╗██║██║╚██╗██║
//     ██║   ███████╗██║  ██║██║  ██║██████╔╝╚██████╔╝╚███╔███╔╝██║ ╚████║
//     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝
//

module.exports = require('machine').build({


  friendlyName: 'Teardown',


  description: 'Destroys a connection manager so that a server can be shut down cleanly.',


  inputs: {

    identity: {
      description: 'The datastore identity to teardown.',
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
      description: 'The configuration was invalid.'
    }

  },


  fn: function teardown(inputs, exits) {
    // Dependencies
    var Helpers = require('./private');

    var datastore = inputs.datastores[inputs.identity];
    if (!datastore) {
      return exits.error(new Error('Invalid data store identity. No data store exist with that identity.'));
    }


    //  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┌─┐┬─┐
    //   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝  │││├─┤│││├─┤│ ┬├┤ ├┬┘
    //  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩   ┴ ┴┴ ┴┘└┘┴ ┴└─┘└─┘┴└─
    var manager = datastore.manager;
    if (!manager) {
      return exits.error(new Error('Missing manager for this data store. The data store may be in the process of being destroyed.'));
    }


    Helpers.connection.destroyManager(manager, function destroyManagerCb(err) {
      if (err) {
        return exits.error(err);
      }

      // Delete the rest of the data from the data store
      delete inputs.datastores[inputs.identity];

      // Delete the model definitions
      delete inputs.modelDefinitions[inputs.identity];

      return exits.success();
    });
  }
});
