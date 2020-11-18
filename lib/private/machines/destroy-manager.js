var _ = require('@sailshq/lodash');


module.exports = {


  friendlyName: 'Destroy manager',


  description: 'Destroy the specified connection manager and all of its active connections.',


  extendedDescription: 'This may involve destroying a pool and its connections, destroying multiple pools and their connections, doing nothing at all (if this manager just does ad-hoc connections), or something even more exotic.  The implementation is left up to the driver.',


  sync: true,


  inputs: {

    manager: {
      description: 'The connection manager instance to destroy.',
      extendedDescription: 'Only managers built using the `createManager()` method of this driver are supported.  Also, the database connection manager instance provided must not have been destroyed--i.e. once `destroyManager()` is called on a manager, it cannot be destroyed again (also note that all existing connections become inactive).',
      example: '===',
      required: true
    },

    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Additional stuff to pass to the driver.',
      extendedDescription: 'This is reserved for custom driver-specific extensions. Please refer to the documentation for the driver you are using for more specific information.',
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'The specified manager and all of its active connections were successfully destroyed.',
      outputFriendlyName: 'Report',
      outputDescription: 'The `meta` property is reserved for custom driver-specific extensions.',
      // outputExample: {
      //   meta: '==='
      // }
      outputExample: '==='
    },

    failed: {
      description: 'The provided connection manager (and/or any of its active connections) could not be destroyed.',
      extendedDescription:
        'Usually, this means the manager has already been destroyed.  But depending on the driver ' +
        'it could also mean that database cannot be accessed.  In production, this can mean that the database ' +
        'server(s) became overwhelemed or were shut off while some business logic was in progress.',
      outputFriendlyName: 'Report',
      outputDescription: 'The `error` property is a JavaScript Error instance with more information and a stack trace.  The `meta` property is reserved for custom driver-specific extensions.',
      outputExample: {
        error: '===',
        meta: '==='
      }
    }

  },


  fn: function (inputs, exits) {

    // If the manager doesn't have a `close` function for some reason,
    // then catch that ahead of time so we can provide a slightly nicer
    // error message and help prevent confusion.
    if (!_.isObject(inputs.manager) || !_.isFunction(inputs.manager.close)) {
      return exits.error(new Error('The provided `manager` is not a valid manager created by this driver.  (It should be a dictionary which contains a `close` function, at the very least.)'));
    }

    // Call close on the manager
    inputs.manager.close();

    return exits.success({
      meta: inputs.meta
    });
  }


};
