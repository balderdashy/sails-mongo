module.exports = {


  friendlyName: 'Set physical sequence',


  description: 'Reset a auto-incrementing sequence to the specified value.',


  sideEffects: 'idempotent',


  inputs: {
    connection: require('../constants/connection.input'),
    sequenceName: { example: 'user_id_seq', required: true },
    sequenceValue: { example: 1, required: true },
    meta: require('../constants/meta.input'),
  },


  exits: {
    notFound: { description: 'Could not find a sequence with the specified name.' },
  },


  fn: function(inputs, exits) {
    // This is a no-op in this adapter.
    //
    // > i.e. we do not currently implement support for ad hoc auto-incrementing
    // > sequences with custom names, so there's no need to implement the logic to
    // > reset such a sequence
    return exits.success();
  }


};
