//  ██████╗ ███████╗███████╗██╗███╗   ██╗███████╗
//  ██╔══██╗██╔════╝██╔════╝██║████╗  ██║██╔════╝
//  ██║  ██║█████╗  █████╗  ██║██╔██╗ ██║█████╗
//  ██║  ██║██╔══╝  ██╔══╝  ██║██║╚██╗██║██╔══╝
//  ██████╔╝███████╗██║     ██║██║ ╚████║███████╗
//  ╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝
//

module.exports = require('machine').build({


  friendlyName: 'Define',


  description: 'Create a new table in the database based on a given schema.',


  inputs: {

    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      example: '==='
    },

    collectionName: {
      description: 'The name of the collectionName to describe.',
      required: true,
      example: 'users'
    },

    definition: {
      description: 'The definition of the schema to build.',
      required: true,
      example: {}
    },

    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Additional stuff to pass to the driver.',
      extendedDescription: 'This is reserved for custom driver-specific extensions.',
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The table was created successfully.'
    },

    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }

  },


  fn: function define(inputs, exits) {
    // No-Op for now
    return exits.success();
  }
});
