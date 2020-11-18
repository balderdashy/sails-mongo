// CONFIG_WHITELIST
//
// The set of non-standard property names in configuration to consider valid.
// Leave `undefined` to tolerate almost anything-- or set to an empty array to
// prevent everything except standard properties.
//
// > http://mongodb.github.io/node-mongodb-native/2.2/reference/connecting/connection-settings/
module.exports = [

  // SSL Options:
  'ssl', 'sslValidate', 'sslCA', 'sslCert', 'sslKey', 'sslPass',

  // Connection Options:
  'poolSize', 'autoReconnect', 'noDelay', 'keepAlive', 'connectTimeoutMS',
  'socketTimeoutMS', 'reconnectTries', 'reconnectInterval',

  // Other Options:
  'ha', 'haInterval', 'replicaSet', 'secondaryAcceptableLatencyMS',
  'acceptableLatencyMS', 'connectWithNoPrimary', 'authSource', 'w',
  'wtimeout', 'j', 'forceServerObjectId', 'serializeFunctions',
  'ignoreUndefined', 'raw', 'promoteLongs', 'bufferMaxEntries',
  'readPreference', 'pkFactory', 'readConcern', 'appname'

];
