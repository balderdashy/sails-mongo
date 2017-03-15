/**
 * `dryOrm`
 *
 * @constant
 * @type {InputDef}
 */
module.exports = {
  friendlyName: 'Dry ORM',
  description: 'The "dry ORM" instance.',
  extendedDescription: 'This includes a property called `models`, which is a dictionary containing all known model definitions, keyed by model identity.',
  required: true,
  readOnly: true,
  example: '==='
  //e.g.
  //```
  //{
  //  models: {
  //    pet: {attributes:{...}, tableName: 'sack_of_pets', identity: 'pet'},
  //  },
  //}
  //```
};
