/**
 * Fixture Schema To Pass To Define
 */

module.exports = {
  first_name: { type: 'string' },
  last_name: { type: 'string' },
  email: { type: 'string' },
  createdAt: { type: 'DATE', default: 'NOW' },
  updatedAt: { type: 'DATE', default: 'NOW' }
};
