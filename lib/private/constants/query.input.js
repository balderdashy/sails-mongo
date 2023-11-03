/**
 * `query`
 *
 * @constant
 * @type {InputDef}
 */
module.exports = {
  friendlyName: 'Query (s3q)',
  description: 'A stage three Waterline query.',
  extendedDescription: 'The `meta` key of this dictionary is reserved for certain special "meta keys" (e.g. flags, signals, etc.) and other custom, adapter-specific extensions.',
  required: true,
  readOnly: true,
  example: '==='//e.g. `{ method: 'create', using: 'the_table_name', ... }`
};
