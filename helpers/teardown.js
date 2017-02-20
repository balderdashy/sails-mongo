//  ████████╗███████╗ █████╗ ██████╗ ██████╗  ██████╗ ██╗    ██╗███╗   ██╗
//  ╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██║    ██║████╗  ██║
//     ██║   █████╗  ███████║██████╔╝██║  ██║██║   ██║██║ █╗ ██║██╔██╗ ██║
//     ██║   ██╔══╝  ██╔══██║██╔══██╗██║  ██║██║   ██║██║███╗██║██║╚██╗██║
//     ██║   ███████╗██║  ██║██║  ██║██████╔╝╚██████╔╝╚███╔███╔╝██║ ╚████║
//     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝
//

module.exports = require('machine').build({


  friendlyName: 'Teardown',


  description: 'Shut down and wipe a datastore from memory, destroying its connection manager (e.g. so that the process can be shut down cleanly.)',


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
      description: 'The datastore was successfully destroyed.'
    }

  },


  fn: function teardown(inputs, exits) {
    // Dependencies
    var WLDriver = require('machinepack-mongo');

    var datastore = inputs.datastores[inputs.identity];
    if (!datastore) {
      return exits.error(new Error('Invalid datastore identity. No data store exist with that identity.'));
    }


    //  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┌─┐┬─┐
    //   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝  │││├─┤│││├─┤│ ┬├┤ ├┬┘
    //  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩   ┴ ┴┴ ┴┘└┘┴ ┴└─┘└─┘┴└─
    var manager = datastore.manager;
    if (!manager) {
      return exits.error(new Error('Consistency violation: Missing manager for this datastore. (This datastore may already be in the process of being destroyed.)'));
    }


    WLDriver.destroyManager({manager: manager}, function destroyManagerCb_(err) {
      if (err) {
        return exits.error(new Error('There was an error destroying the connection manager.\n\n' + err.stack));
      }

      try {
        // Delete the rest of the data from the data store
        delete inputs.datastores[inputs.identity];

        // Delete the model definitions
        delete inputs.modelDefinitions[inputs.identity];
      } catch (e) { return exits.error(e); }

      return exits.success();
    });
  }


});
