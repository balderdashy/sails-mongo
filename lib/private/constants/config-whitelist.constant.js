// CONFIG_WHITELIST
//
// The set of non-standard property names in configuration to consider valid.
// Leave `undefined` to tolerate almost anything-- or set to an empty array to
// prevent everything except standard properties.
//
// > https://mongodb.github.io/node-mongodb-native/3.5/api/MongoClient.html#.connect
module.exports = [

  // SSL Options:
  'ssl', 'sslValidate', 'sslCA', 'sslCert', 'sslKey', 'sslPass', 'sslCRL', 'checkServerIdentity',

  // TLS Options:
  'tls', 'tlsInsecure', 'tlsCAFile', 'tlsCertificateKeyFile', 'tlsCertificateKeyFilePassword',
  'tlsAllowInvalidCertificates', 'tlsAllowInvalidHostnames',

  // Connection Options:
  'poolSize', 'autoReconnect', 'noDelay', 'keepAlive', 'keepAliveInitialDelay', 'connectTimeoutMS',
  'socketTimeoutMS', 'family', 'reconnectTries', 'reconnectInterval', 'retryWrites',

  // Other Options:
  'ha', 'haInterval', 'replicaSet', 'secondaryAcceptableLatencyMS',
  'acceptableLatencyMS', 'connectWithNoPrimary', 'authSource', 'w',
  'wtimeout', 'j', 'forceServerObjectId', 'serializeFunctions',
  'ignoreUndefined', 'raw', 'bufferMaxEntries', 'readPreference',
  'pkFactory', 'promiseLibrary', 'readConcern', 'maxStalenessSeconds',
  'loggerLevel', 'logger', 'promoteValues', 'promoteLongs', 'promoteBuffers',
  'domainsEnabled', 'validateOptions', 'appname', 'auth.user', 'auth.password',
  'authMechanism', 'compression', 'fsync', 'readPreferenceTags', 'numberOfRetries',
  'auto_reconnect', 'monitorCommands', 'minSize', 'useNewUrlParser', 'useUnifiedTopology',
  'localThresholdMS', 'serverSelectionTimeoutMS', 'heartbeatFrequencyMS', 'autoEncryption',
  'driverInfo'

];
