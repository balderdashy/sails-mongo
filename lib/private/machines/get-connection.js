module.exports = {


  friendlyName: 'Get connection',


  description: 'Get an active connection to the database (in Mongo, this is currently a no-op).',


  moreInfoUrl: 'https://github.com/node-machine/driver-interface/blob/master/machines/get-connection.js',


  sync: true,


  inputs: {

    manager: {
      description: 'A Mongo client instance (e.g. `db`).',
      example: '===',
      required: true
    },

    meta: {
      friendlyName: 'Meta (unused)',
      description: 'Additional stuff to pass to the driver.',
      example: '==='
    }

  },


  exits: {

    success: {
      outputFriendlyName: 'Report',
      outputDescription: 'The `connection` property is a Mongo client instance. The `meta` property is unused.',
      // outputExample: {
      //   connection: '===',
      //   meta: '==='
      // }
      outputExample: '==='
    },

    failed: {
      friendlyName: 'Failed (unused)',
      description: 'Could not acquire a connection to the database via the provided connection manager. (WARNING: Currently, this is ignored by mp-mongo!)',
      outputFriendlyName: 'Report',
      outputExample: {
        error: '===',
        meta: '==='
      }
    }

  },


  fn: function (inputs, exits) {
    // This is a no-op that just sends back the manager and `meta` that were passed in.
    // Currently in mp-mongo, a "manager" and "connection" are the same thing: a Mongo client instance.
    return exits.success({
      connection: inputs.manager,
      meta: inputs.meta
    });
  }


};
