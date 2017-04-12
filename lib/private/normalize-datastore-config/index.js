/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var url = require('url');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var qs = require('qs');
var normalizeDatabase = require('./private/normalize-database');
var normalizeUser = require('./private/normalize-user');
var normalizePort = require('./private/normalize-port');
var normalizeHost = require('./private/normalize-host');
var normalizePassword = require('./private/normalize-password');


/**
 * normalizeDatastoreConfig()
 *
 * Normalize the provided datastore config dictionary.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * NOTES:
 * • All modifications are performed in-place!
 * • Top-level overrides like `host`, `port`, `user`, etc. are normalized and validated.
 * • Top-level overrides like `host`, `port`, `user`, etc. take precedence over whatever is in the URL.
 * • Normalized versions of top-level overrides like `host`, `port`, `user`, etc. °°ARE°° sucked into the URL automatically.
 * • Recognized URL pieces like the host, port, user, etc. **ARE NOT** attached as top-level props automatically.
 * • Recognized URL pieces like the host, port, user, etc. **ARE** validated and normalized individually, rebuilding the URL if necessary.
 * • Miscellanous properties **ARE NOT** sucked in to the URL automatically.
 * • Miscellaneous querystring opts in the URL °°ARE°° attached automatically as top-level props.
 *   · They are left as-is in the URL as well.
 *   · They are treated as strings (e.g. `?foo=0&bar=false` becomes `{foo:'0', bar: 'false'}`)
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {Dictionary}   dsConfig
 *         ˚¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯\
 *         ˙ identity: {String}       :: The name of this datastore.  (Used for error messages.)
 *         ˙ url: {String?}           ::
 *         ˙ host: {String?}          ::
 *         ˙ port: {String?}          ::
 *         ˙ user: {String?}          ::
 *         ˙ password: {String?}      ::
 *         ˙ database: {String?}      ::
 *
 * @param {Array} whitelist
 *        Optional.  If provided, this is an array of strings indicating which custom settings
 *        are recognized and should be allowed.  The standard `url`/`host`/`database` etc. are
 *        always allowed, no matter what.  e.g. `['ssl', 'replicaSet']`
 *
 * @param {String} expectedProtocolPrefix
 *        Optional.  If specified, this restricts `dsConfig.url` to use a mandatory protocol (e.g. "mongodb")
 *        If no protocol is included (or if it is simply `://`), then this mandatory protocol
 *        will be tacked on automatically.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function normalizeDatastoreConfig (dsConfig, whitelist, expectedProtocolPrefix) {

  // Sanity checks
  assert(_.isObject(dsConfig) && _.isString(dsConfig.identity) && dsConfig.identity, '`identity` should exist and be truthy in dsConfig!');
  assert(_.isUndefined(whitelist) || _.isArray(whitelist), 'If provided, 2nd argument should be a whitelist of valid custom settings-- e.g. [\'ssl\', \'replicaSet\']');
  assert(_.isUndefined(expectedProtocolPrefix) || _.isString(expectedProtocolPrefix), 'If provided, 2nd argument should be a string (e.g. "mongodb") representing the prefix for the expected protocol.');


  // If non-standard option whitelist was provided, expand it to include standard properties:
  // (Note that this whitelist applies to overrides AND to querystring-encoded values)
  if (whitelist) {
    whitelist = _.uniq(whitelist.concat([
      'user',
      'password',
      'host',
      'port',
      'database',
    ]));
  }

  // If items on this blacklist are included in the querystring of the connection url,
  // they are allowed to remain, but are not automatically applied at the top-level.
  var QS_BLACKLIST = [
    'url',
    'adapter',
    'identity',
  ];

  // // Get convenient reference to this datastore's name.
  // var datastoreName = dsConfig.identity;


  // Have a look at the datastore config to get an idea of what's there.
  var hasUrl = !_.isUndefined(dsConfig.url);
  var hasUserOverride = !_.isUndefined(dsConfig.user);
  var hasPasswordOverride = !_.isUndefined(dsConfig.password);
  var hasHostOverride = !_.isUndefined(dsConfig.host);
  var hasPortOverride = !_.isUndefined(dsConfig.port);
  var hasDatabaseOverride = !_.isUndefined(dsConfig.database);


  //  ┌┐┌┌─┐┬─┐┌┬┐┌─┐┬  ┬┌─┐┌─┐  ╔═╗╦  ╦╔═╗╦═╗╦═╗╦╔╦╗╔═╗╔═╗
  //  ││││ │├┬┘│││├─┤│  │┌─┘├┤   ║ ║╚╗╔╝║╣ ╠╦╝╠╦╝║ ║║║╣ ╚═╗
  //  ┘└┘└─┘┴└─┴ ┴┴ ┴┴─┘┴└─┘└─┘  ╚═╝ ╚╝ ╚═╝╩╚═╩╚═╩═╩╝╚═╝╚═╝
  //      ┬ ┌─┐   ┌─┐┌─┐┌┬┐┌┬┐┬┌┐┌┌─┐┌─┐  ┌┬┐┬ ┬┌─┐┌┬┐  ┌┬┐┌─┐┬┌─┌─┐
  //      │ ├┤    └─┐├┤  │  │ │││││ ┬└─┐   │ ├─┤├─┤ │    │ ├─┤├┴┐├┤
  //  ooo ┴o└─┘o  └─┘└─┘ ┴  ┴ ┴┘└┘└─┘└─┘   ┴ ┴ ┴┴ ┴ ┴    ┴ ┴ ┴┴ ┴└─┘
  //  ┌─┐┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐┌┐┌┌─┐┌─┐  ┌─┐┬  ┬┌─┐┬─┐  ┌─┐┌┬┐┌─┐┌┐┌┌┬┐┌─┐┬─┐┌┬┐
  //  ├─┘├┬┘├┤ │  ├┤  ││├┤ ││││  ├┤   │ │└┐┌┘├┤ ├┬┘  └─┐ │ ├─┤│││ ││├─┤├┬┘ ││
  //  ┴  ┴└─└─┘└─┘└─┘─┴┘└─┘┘└┘└─┘└─┘  └─┘ └┘ └─┘┴└─  └─┘ ┴ ┴ ┴┘└┘─┴┘┴ ┴┴└──┴┘
  //  ┌─┐┬ ┬┬ ┬┌┐┌┬┌─┌─┐  ┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬ ┬┬─┐┬
  //  │  ├─┤│ ││││├┴┐└─┐  │ │├┤    │ ├─┤├┤   │  │ │││││││├┤ │   │ ││ ││││  │ │├┬┘│
  //  └─┘┴ ┴└─┘┘└┘┴ ┴└─┘  └─┘└     ┴ ┴ ┴└─┘  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘  └─┘┴└─┴─┘
  try {

    if (hasUserOverride) {
      dsConfig.user = normalizeUser(dsConfig.user);
    }

    if (hasPasswordOverride) {
      dsConfig.password = normalizePassword(dsConfig.password);
    }

    if (hasHostOverride) {
      dsConfig.host = normalizeHost(dsConfig.host);
    }

    if (hasPortOverride) {
      dsConfig.port = normalizePort(dsConfig.port);
    }

    if (hasDatabaseOverride) {
      dsConfig.database = normalizeDatabase(dsConfig.database);
    }

  } catch (e) {
    switch (e.code) {
      case 'E_BAD_CONFIG': throw flaverr('E_BAD_CONFIG', new Error(
        'Invalid override specified.  '+e.message+'\n'+
        '--\n'+
        'Please correct this and try again...  Or better yet, specify a `url`!  '+
        '(See http://sailsjs.com/config/datastores#?the-connection-url for more info.)'
      ));
      default: throw e;
    }
  }//</catch>


  // If relevant, check overrides against whitelist.
  // TODO



  //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ┌─┐┌┐ ┌─┐┌─┐┌┐┌┌─┐┌─┐  ┌─┐┌─┐  ┬ ┬┬─┐┬
  //  ├─┤├─┤│││ │││  ├┤   ├─┤├┴┐└─┐├┤ ││││  ├┤   │ │├┤   │ │├┬┘│
  //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ┴ ┴└─┘└─┘└─┘┘└┘└─┘└─┘  └─┘└    └─┘┴└─┴─┘
  //  ┌─    ┌┐ ┌─┐┌─┐┬┌─┬ ┬┌─┐┬─┐┌┬┐┌─┐   ┌─┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┬┌┐ ┬┬  ┬┌┬┐┬ ┬    ─┐
  //  │───  ├┴┐├─┤│  ├┴┐│││├─┤├┬┘ ││└─┐───│  │ ││││├─┘├─┤ │ │├┴┐││  │ │ └┬┘  ───│
  //  └─    └─┘┴ ┴└─┘┴ ┴└┴┘┴ ┴┴└──┴┘└─┘   └─┘└─┘┴ ┴┴  ┴ ┴ ┴ ┴└─┘┴┴─┘┴ ┴  ┴     ─┘

  // If a URL config value was not given, ensure that all the various pieces
  // needed to create one exist.  Then build a URL and attach it to the datastore config.
  if (!hasUrl) {

    // Invent a connection URL on the fly.
    // > Note: The `createManager` method will supply the protocol (e.g. mongodb://).
    var inventedUrl = '';

    // If authentication info was specified, add it:
    if (hasPasswordOverride && hasUserOverride) {
      inventedUrl += dsConfig.user+':'+dsConfig.password+'@';
    }
    else if (!hasPasswordOverride && hasUserOverride) {
      inventedUrl += dsConfig.user+'@';
    }
    else if (hasPasswordOverride && !hasUserOverride) {
      throw flaverr('E_BAD_CONFIG', new Error(
        'No `url` was specified, so tried to infer an appropriate connection URL from other properties.  '+
        'However, it looks like a `password` was specified, but no `user` was specified to go along with it.\n'+
        '--\n'+
        'Please remove `password` or also specify a `user`.  Or better yet, specify a `url`!  '+
        '(See http://sailsjs.com/config/datastores#?the-connection-url for more info.)'
      ));
    }

    // If a host was specified, use it.
    // (Otherwise, fall back to "localhost")
    if (hasHostOverride) {
      inventedUrl += dsConfig.host;
    }
    else {
      throw flaverr('E_BAD_CONFIG', new Error(
        'No `url` was specified, and no appropriate connection URL can be inferred (tried to use '+
        '`host: '+util.inspect(dsConfig.host)+'`).\n'+
        '--\n'+
        'Please specify a `host`...  Or better yet, specify a `url`!  '+
        '(See http://sailsjs.com/config/datastores#?the-connection-url for more info.)'
      ));
      // Or alternatively...
      // ```
      // inventedUrl += 'localhost';
      // ```
    }

    // If a port was specified, use it.
    if (hasPortOverride) {
      inventedUrl += ':'+dsConfig.port;
    }

    // If a database was specified, use it.
    if (hasDatabaseOverride) {
      inventedUrl += '/'+dsConfig.database;
    }
    else {
      throw flaverr('E_BAD_CONFIG', new Error(
        'No `url` was specified, and no appropriate connection URL can be inferred (tried to use '+
        '`database: '+util.inspect(dsConfig.database)+'`).\n'+
        '--\n'+
        'Please specify a `database`...  Or better yet, specify a `url`!  '+
        '(See http://sailsjs.com/config/datastores#?the-connection-url for more info.)'
      ));
    }

    // - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Log a compatibility warning..?  Maybe.
    //
    // > To help standardize configuration for end users, adapter authors
    // > are encouraged to support the `url` setting, if conceivable.
    // >
    // > Read more here:
    // > http://sailsjs.com/config/datastores#?the-connection-url
    // - - - - - - - - - - - - - - - - - - - - - - - -

    // Now save our invented URL as `url`.
    dsConfig.url = inventedUrl;

  }
  //  ┌─┐┌─┐┬─┐┌─┐┌─┐   ┬   ┌┐┌┌─┐┬─┐┌┬┐┌─┐┬  ┬┌─┐┌─┐  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ╦ ╦╦═╗╦
  //  ├─┘├─┤├┬┘└─┐├┤   ┌┼─  ││││ │├┬┘│││├─┤│  │┌─┘├┤   │  │ │││││││├┤ │   │ ││ ││││  ║ ║╠╦╝║
  //  ┴  ┴ ┴┴└─└─┘└─┘  └┘   ┘└┘└─┘┴└─┴ ┴┴ ┴┴─┘┴└─┘└─┘  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘  ╚═╝╩╚═╩═╝
  // Otherwise, normalize & parse the connection URL.
  else {

    // Perform a basic sanity check & string coercion.
    if (!_.isString(dsConfig.url) || dsConfig.url === '') {
      throw flaverr('E_BAD_CONFIG', new Error(
        'Invalid `url` specified.  Must be a non-empty string.\n'+
        '--\n'+
        '(See http://sailsjs.com/config/datastores#?the-connection-url for more info.)'
      ));
    }


    // First, make sure there's a protocol:
    // We don't actually care about the protocol... but the underlying library (e.g. `mongodb`) might.
    // Plus, more importantly, Node's `url.parse()` returns funky results if the argument doesn't
    // have one.  So we'll add one if necessary.
    // > See https://en.wikipedia.org/wiki/Uniform_Resource_Identifier#Syntax
    var urlToParse;
    if (dsConfig.url.match(/^:\/\//)) {
      urlToParse = dsConfig.url.replace(/^:\/\//, (expectedProtocolPrefix||'db')+'://');
    }
    else if (!dsConfig.url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
      urlToParse = (expectedProtocolPrefix||'db')+'://'+dsConfig.url;
    }//>-


    // Now attempt to parse out the URL's pieces and validate each one.
    var parsedConnectionStr = url.parse(urlToParse);


    // Ensure a valid protocol.

    // Validate that a protocol was found before other pieces
    // (otherwise other parsed info could be very weird and wrong)
    if (!parsedConnectionStr.protocol) {
      throw flaverr('E_BAD_CONFIG', new Error(
        'Could not parse provided URL ('+util.inspect(dsConfig.url,{depth:5})+').\n'+
        '(If you continue to experience issues, try checking that the URL begins with an '+
        'appropriate protocol; e.g. `mysql://` or `mongo://`.\n'+
        '--\n'+
        '(See http://sailsjs.com/config/datastores#?the-connection-url for more info.)'
      ));
    }

    // If relevant, validate that the RIGHT protocol was found.
    if (expectedProtocolPrefix) {
      if (parsedConnectionStr.protocol !== expectedProtocolPrefix+':') {
        throw flaverr('E_BAD_CONFIG', new Error(
          'Provided URL ('+util.inspect(dsConfig.url,{depth:5})+') has an invalid protocol.\n'+
          'If included, the protocol must be "'+expectedProtocolPrefix+'://".\n'+
          '--\n'+
          '(See http://sailsjs.com/config/datastores#?the-connection-url for more info.)'
        ));
      }
    }//>-


    // Parse authentication credentials from url, if specified.
    var userInUrl;
    var passwordInUrl;
    if (parsedConnectionStr.auth && _.isString(parsedConnectionStr.auth)) {
      var authPieces = parsedConnectionStr.auth.split(/:/);
      if (authPieces[0]) {
        userInUrl = authPieces[0];
      }//>-
      if (authPieces[1]) {
        passwordInUrl = authPieces[1];
      }
    }


    // Parse the rest of the standard information from the URL.
    var hostInUrl = parsedConnectionStr.hostname;
    var portInUrl = parsedConnectionStr.port;
    var databaseInUrl = parsedConnectionStr.pathname;

    // And finally parse the non-standard info from the URL.
    var miscOptsInUrl;
    try {
      miscOptsInUrl = qs.parse(parsedConnectionStr.query);
    } catch (e) {
      throw flaverr('E_BAD_CONFIG', new Error(
        'Could not parse query string from URL: `'+dsConfig.url+'`.  '+
        'Details: '+e.stack
      ));
    }



    // Now normalize + restore parsed values back into overrides.
    // > • Note that we prefer overrides to URL data here.
    // > • Also remember that overrides have already been normalized/validated above.
    // > • And finally, also note that we enforce the whitelist for non-standard props
    // >   here, if relevant.  This is so we can provide a clear error message about where
    // >   the whitelist violation came from.
    try {

      if (userInUrl && !hasUserOverride) {
        dsConfig.user = normalizeUser(userInUrl);
      }
      if (passwordInUrl && !hasPasswordOverride) {
        dsConfig.password = normalizePassword(passwordInUrl);
      }
      if (hostInUrl && !hasHostOverride) {
        dsConfig.host = normalizeHost(hostInUrl);
      }
      if (portInUrl && !hasPortOverride) {
        dsConfig.port = normalizePort(portInUrl);
      }
      if (databaseInUrl && !hasDatabaseOverride) {
        databaseInUrl = _.trim(databaseInUrl, '/');
        dsConfig.database = normalizeDatabase(databaseInUrl);
      }

      _.each(miscOptsInUrl, function (val, key) {

        if (whitelist && !_.contains(whitelist, key)) {
          throw flaverr('E_BAD_CONFIG', new Error(
            'Unrecognized option (`'+key+'`) specified in query string of connection URL.\n'+
            '(Expected a standard, whitelisted property.)\N'+
            '--\n'+
            'See http://sailsjs.com/config/datastores#?the-connection-url for info, or visit\n)'+
            'https://sailsjs.com/support for more help.'
          ));
        }

        if (_.contains(QS_BLACKLIST, key)) {

          // Currently, we ignore these-- leaving them in the URL but not sticking them at the top level.

          // FUTURE: consider bringing this back instead, for clarity:
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // throw flaverr('E_BAD_CONFIG', new Error(
          //   'Unexpected option (`'+key+'`) is NEVER allowed in the query string of a connection URL.\n'+
          //   '--\n'+
          //   'See http://sailsjs.com/config/datastores#?the-connection-url for info, or visit\n)'+
          //   'https://sailsjs.com/support for more help.'
          // ));
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        }
        else if (_.isUndefined(dsConfig[key])) {
          dsConfig[key] = val;
        }

      });//</_.each()>

    } catch (e) {
      switch (e.code) {
        case 'E_BAD_CONFIG': throw flaverr('E_BAD_CONFIG', new Error(
          'Could not process connection url.  '+e.message+'\n'+
          '--\n'+
          'Please correct this and try again.\n'+
          '(See http://sailsjs.com/config/datastores#?the-connection-url for more info.)'
        ));
        default: throw e;
      }
    }//</catch>




    // And finally, rebuild the URL
    // var rebuiltUrl;

    // If user/password were specified in the url OR as overrides, use them.
    // TODO

    // If a host was specified in the url OR as an override, use it.
    // (prefer override)
    // TODO

    // If a port was specified in the url OR as an override, use it.
    // (prefer override)
    // TODO

    // If a database was specified in the url OR as an override, use it.
    // (prefer override)
    // TODO

    // Reattach any non-standard querystring options from the URL.
    // > If there were any non-standard options, we'll **LEAVE THEM IN** the URL
    // > when we rebuild it.  But note that we did fold them into the dsConfig
    // > dictionary as well earlier.
    // TODO


    // Now save our rebuilt URL as `url`.
    // TODO: uncomment
    // ```
    // dsConfig.url = rebuiltUrl;
    // ```

  }


};





    // ------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------
    //   // Use properties of `meta` directly as Mongo Server config.
    //   // (note that we're very careful to only stick a property on the client config
    //   //  if it was not undefined, just in case that matters)
    //   // http://mongodb.github.io/node-mongodb-native/2.2/reference/connecting/connection-settings/
    //   var configOptions = [
    //     // Mongo Server Options:
    //     // ============================================

    //     // SSL Options:
    //     'ssl', 'sslValidate', 'sslCA', 'sslCert', 'sslKey', 'sslPass',

    //     // Connection Options:
    //     'poolSize', 'autoReconnect', 'noDelay', 'keepAlive', 'connectTimeoutMS',
    //     'socketTimeoutMS', 'reconnectTries', 'reconnectInterval',

    //     // Other Options:
    //     'ha', 'haInterval', 'replicaSet', 'secondaryAcceptableLatencyMS',
    //     'acceptableLatencyMS', 'connectWithNoPrimary', 'authSource', 'w',
    //     'wtimeout', 'j', 'forceServerObjectId', 'serializeFunctions',
    //     'ignoreUndefined', 'raw', 'promoteLongs', 'bufferMaxEntries',
    //     'readPreference', 'pkFactory', 'readConcern'

    //   ];

    //   _.each(configOptions, function addConfigValue(clientConfKeyName) {
    //     if (!_.isUndefined(inputs.meta[clientConfKeyName])) {
    //       _clientConfig[clientConfKeyName] = inputs.meta[clientConfKeyName];
    //     }
    //   });


    //   // In the future, other special properties of `meta` could be used
    //   // as options for the manager-- e.g. the connection strings of replicas, etc.
    // }

    // // Validate & parse connection string, pulling out Postgres client config
    // // (call `malformed` if invalid).
    // //
    // // Remember: connection string takes priority over `meta` in the event of a conflict.
    // var connectionString = inputs.connectionString;
    // try {
    //   // We don't actually care about the protocol, the MongoDB driver does,
    //   // plus `url.parse()` returns funky results if the argument doesn't have one.
    //   // So we'll add one if necessary.
    //   // See https://en.wikipedia.org/wiki/Uniform_Resource_Identifier#Syntax
    //   if (!connectionString.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    //     connectionString = 'mongodb://' + connectionString;
    //   }
    //   var parsedConnectionStr = url.parse(connectionString);

    //   // Validate that a protocol was found before other pieces
    //   // (otherwise other parsed info will be very weird and wrong)
    //   if (!parsedConnectionStr.protocol || parsedConnectionStr.protocol !== 'mongodb:') {
    //     throw new Error('Protocol (i.e. `mongodb://`) is required in connection string.');
    //   }

    //   // Parse user & password
    //   if (parsedConnectionStr.auth && _.isString(parsedConnectionStr.auth)) {
    //     var authPieces = parsedConnectionStr.auth.split(/:/);
    //     if (authPieces[0]) {
    //       _clientConfig.user = authPieces[0];
    //     }
    //     if (authPieces[1]) {
    //       _clientConfig.password = authPieces[1];
    //     }
    //   }
    // } catch (_e) {
    //   _e.message = util.format('Provided value (`%s`) is not a valid Mongodb connection string.', inputs.connectionString) + ' Error details: ' + _e.message;
    //   return exits.malformed({
    //     error: _e,
    //     meta: inputs.meta
    //   });
    // }
    // ------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------

