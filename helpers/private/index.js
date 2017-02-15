module.exports = {
  // Helpers for handling connections
  connection: {
    createManager: require('./connection/create-manager'),
    destroyManager: require('./connection/destroy-manager'),
    releaseConnection: require('./connection/release-connection'),
    spawnConnection: require('./connection/spawn-connection')
  },

  // Helpers for handling query logic
  query: {
    create: require('./query/create'),
    createEach: require('./query/create-each'),
    normalizeWhere: require('./query/normalize-where'),
    parseObjectId: require('./query/parse-object-id'),
    processEachRecord: require('./query/process-each-record'),
    preProcessRecord: require('./query/pre-process-record'),
  },

  // Helpers for dealing with underlying database schema
  schema: {
    // buildIndexes: require('./schema/build-indexes'),
    // buildSchema: require('./schema/build-schema'),
    // escapeTableName: require('./schema/escape-table-name')
  }
};
