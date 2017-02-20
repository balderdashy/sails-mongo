module.exports = {

  // Private utilities for handling query logic
  query: {
    create: require('./query/create'),
    createEach: require('./query/create-each'),
    normalizeWhere: require('./query/normalize-where'),
    processEachRecord: require('./query/process-each-record'),
    preProcessRecord: require('./query/pre-process-record'),
  },

};
