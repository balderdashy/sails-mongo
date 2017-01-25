//  ███████╗███████╗████████╗    ███████╗███████╗ ██████╗ ██╗   ██╗███████╗███╗   ██╗ ██████╗███████╗
//  ██╔════╝██╔════╝╚══██╔══╝    ██╔════╝██╔════╝██╔═══██╗██║   ██║██╔════╝████╗  ██║██╔════╝██╔════╝
//  ███████╗█████╗     ██║       ███████╗█████╗  ██║   ██║██║   ██║█████╗  ██╔██╗ ██║██║     █████╗
//  ╚════██║██╔══╝     ██║       ╚════██║██╔══╝  ██║▄▄ ██║██║   ██║██╔══╝  ██║╚██╗██║██║     ██╔══╝
//  ███████║███████╗   ██║       ███████║███████╗╚██████╔╝╚██████╔╝███████╗██║ ╚████║╚██████╗███████╗
//  ╚══════╝╚══════╝   ╚═╝       ╚══════╝╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
//

module.exports = require('machine').build({


  friendlyName: 'Set Sequence',


  description: 'Sets the current version of a sequence from a migration.',


  inputs: {

    datastore: {
      description: 'The datastore to use for connections.',
      extendedDescription: 'Datastores represent the config and manager required to obtain an active database connection.',
      required: true,
      readOnly: true,
      example: '==='
    },

    sequenceName: {
      description: 'The name of the sequence to set the value for.',
      required: true,
      example: 'user_id_seq'
    },

    sequenceValue: {
      description: 'The value to set the sequence to.',
      required: true,
      example: 123
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
      description: 'The sequence was set successfully.'
    },

    badConnection: {
      friendlyName: 'Bad connection',
      description: 'A connection either could not be obtained or there was an error using the connection.'
    }

  },


  fn: function select(inputs, exits) {
    // Return a no-op.
    setImmediate(function ensureAsync() {
      return exits.success();
    });
  }
});
