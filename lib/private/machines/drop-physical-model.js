module.exports = {


  friendlyName: 'Drop (physical model)',


  description: 'Completely drop & destroy any traces of a particular physical model (i.e. Mongo collection).',


  sideEffects: 'idempotent',


  inputs: {
    connection: require('../constants/connection.input'),
    tableName: require('../constants/table-name.input'),
    meta: require('../constants/meta.input'),
  },


  exits: {
    success: { description: 'If such a physical model exists, it was dropped successfully.' }
  },


  fn: function (inputs, exits) {
    // Note that this is currently implemented inline in the main adapter file.
    // (It will change to use this approach in a future release of sails-mongo.)
    return exits.error(new Error('Not implemented yet'));
  }


};
