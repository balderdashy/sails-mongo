//  ████████╗███████╗ █████╗ ██████╗ ██████╗  ██████╗ ██╗    ██╗███╗   ██╗
//  ╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██║    ██║████╗  ██║
//     ██║   █████╗  ███████║██████╔╝██║  ██║██║   ██║██║ █╗ ██║██╔██╗ ██║
//     ██║   ██╔══╝  ██╔══██║██╔══██╗██║  ██║██║   ██║██║███╗██║██║╚██╗██║
//     ██║   ███████╗██║  ██║██║  ██║██████╔╝╚██████╔╝╚███╔███╔╝██║ ╚████║
//     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// FUTURE: Pull this into Waterline core.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

module.exports = require('machine').build({


  friendlyName: 'Teardown',


  description: 'Shut down and wipe a datastore from memory, destroying its connection manager (e.g. so that the process can be shut down cleanly.)',


  inputs: {

    identity: {
      description: 'The identity of the datastore.',
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
      description: 'The datastore was successfully torn down.',
      outputFriendlyName: 'Meta (maybe)',
      outputExample: '==='
    }

  },


  fn: function teardown(inputs, exits) {
    // Dependencies
    var WLDriver = require('machinepack-mongo');

    var datastore = inputs.datastores[inputs.identity];
    if (!datastore) {
      return exits.error(new Error('No datastore exists with that identity (`'+inputs.identity+'`).'));
    }

    //  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦  ┌┬┐┌─┐┌┐┌┌─┐┌─┐┌─┐┬─┐
    //   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝  │││├─┤│││├─┤│ ┬├┤ ├┬┘
    //  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩   ┴ ┴┴ ┴┘└┘┴ ┴└─┘└─┘┴└─
    var manager = datastore.manager;
    if (!manager) {
      return exits.error(new Error('Consistency violation: Missing manager for this datastore. (This datastore may already be in the process of being destroyed.)'));
    }

    WLDriver.destroyManager({ manager: manager }, {
      error: function(err) { return exits.error(new Error('Encountered unexpected error when attempting to destroy the connection manager.\n\n' + err.stack)); },
      failed: function(report) {
        var err = new Error('Datastore (`'+inputs.identity+'`) could not be torn down, because of a failure when attempting to destroy the connection manager.\n\n' + report.error.stack);
        if (report.meta) { err.meta = report.meta; }
        return exits.error(err);
      },
      success: function (report) {

        try {
          // Delete the rest of the data from the datastore
          delete inputs.datastores[inputs.identity];

          // Delete the model definitions
          delete inputs.modelDefinitions[inputs.identity];
        } catch (e) { return exits.error(e); }

        return exits.success(report.meta);

      }//•-success>
    });//destroyManager()>
  }


});
