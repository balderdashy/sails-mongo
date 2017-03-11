/**
 * `notUnique`
 *
 * @constant
 * @type {ExitDef}
 */
module.exports = {
  description: 'Could not persist changes because they would violate one or more uniqueness constraints.',
  moreInfoUrl: 'https://github.com/sailshq/waterline-query-docs/blob/8fc158d8460aa04ee6233fefbdf83cc17e7645df/docs/errors.md',
  outputFriendlyName: 'Uniqueness error',
  outputDescription: 'A native error from the database, with an extra key (`footprint`) attached.',
  outputExample: '==='// e.g. an Error instance with a `footprint` attached
};
