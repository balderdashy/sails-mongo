/**
 * `connection`
 *
 * @constant
 * @type {InputDef}
 */
module.exports = {
  description: 'The active database connection to use.',
  extendedDescription: 'This connection _will not be released automatically_ or mutated in any other way by this machine.',
  whereToGet: { description: 'Use getConnection().' },
  example: '===',
  readOnly: true,
  required: true,
};
