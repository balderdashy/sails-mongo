var _ = require('@sailshq/lodash');


module.exports = {


  friendlyName: 'Release connection',


  description: 'Release an active database connection.',


  extendedDescription: 'Depending on the implementation of this driver, this might release the connection back into the pool or close it entirely.  Regardless, if the provided connection has a transaction started, be sure to end the transaction by either committing it or rolling it back before releasing the connection.',


  sync: true,


  inputs: {

    connection: {
      description: 'An active database connection.',
      extendedDescription: 'The provided database connection instance must still be active.  Only database connection instances created by the `getConnection()` machine in this driver are supported.',
      example: '===',
      required: true
    },

    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Additional stuff to pass to the driver.',
      extendedDescription: 'This is reserved for custom driver-specific extensions.  Please refer to the documentation for the driver you are using for more specific information.',
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The connection was released and is no longer active.',
      extendedDescription: 'The provided connection may no longer be used for any subsequent queries.',
      outputFriendlyName: 'Report',
      outputDescription: 'The `meta` property is reserved for custom driver-specific extensions.',
      // outputExample: {
      //   meta: '==='
      // }
      outputExample: '==='
    },

    badConnection: {
      description: 'The provided connection is no longer active; or possibly never was.',
      extendedDescription: 'Usually, this means the connection to the database was lost due to a logic error or timing issue in userland code.  In production, this can mean that the database became overwhelemed or was shut off while some business logic was in progress.',
      outputFriendlyName: 'Report',
      outputDescription: 'The `meta` property is reserved for custom driver-specific extensions.',
      // outputExample: {
      //   meta: '==='
      // }
      outputExample: '==='
    }

  },


  fn: function (inputs, exits) {

    // If the connection doesn't have a `close` function for some reason,
    // then catch that ahead of time so we can provide a slightly nicer
    // error message and help prevent confusion.
    if (!_.isObject(inputs.connection) || !_.isFunction(inputs.connection.close)) {
      return exits.badConnection();
    }


    // This is a no-op function because the cursor and the pool automatically
    // releases the connection back into the pool once the query has run.
    return exits.success({
      meta: inputs.meta
    });
  }


};
