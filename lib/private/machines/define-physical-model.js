module.exports = {


  friendlyName: 'Define (physical model)',


  description: 'Define a physical model (i.e. Mongo collection) with the specified characteristics, creating indexes as needed.',


  sideEffects: 'idempotent',


  inputs: {
    connection: require('../constants/connection.input'),
    tableName: require('../constants/table-name.input'),
    columns: {
      description: 'An array of column definitions.',
      required: true,
      example: '===',
      // e.g. =>
      // ```
      // [
      //   {
      //     columnName: 'foo_bar',
      //     unique: true,
      //     columnType: 'VARCHAR(255)',
      //     autoIncrement: false,
      //   },
      // ]
      // ```
    },
    meta: require('../constants/meta.input'),
  },


  exits: {
    success: { description: 'New physical model (and any necessary indexes) were created successfully.' }
  },


  fn: function (inputs, exits) {
    // Note that this is currently implemented inline in the main adapter file.
    // (It will change to use this approach in a future release of sails-mongo.)
    return exits.error(new Error('Not implemented yet'));
  }


};
