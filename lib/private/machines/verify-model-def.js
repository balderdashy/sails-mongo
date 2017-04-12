module.exports = {


  friendlyName: 'Verify model def',


  description: 'Verify that the specified model definition is compatible with this adapter.',


  extendedDescription: 'This assumes that the provided model def has already undergone adapter-agnostic normalization, and is considered generally valid.',


  sideEffects: 'cacheable',


  sync: true,


  inputs: {

    modelDef: {
      description: 'A Waterline model definition.',
      extendedDescription: 'This model definition should already be fully-formed (i.e. it should have undergone generic normalization/validation already).',
      moreInfoUrl: 'http://sailsjs.com/documentation/concepts/models-and-orm/models',
      example: '===',// {}
      readOnly: true,
      required: true
    }

  },


  exits: {

    invalid: {
      description: 'The provided model definition was invalid.',
      outputFriendlyName: 'Error',
      outputExample: '==='// e.g. new Error('Primary key attribute should have `columnName: \'_id\'`.')
    }

  },


  fn: function (inputs, exits) {
    return exits.success();
  }


};
