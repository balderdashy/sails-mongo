/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
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
 *   · If there is a pre-existing top-level property with the same name, an error is thrown.
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
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function normalizeDatastoreConfig (dsConfig) {

  // Sanity checks
  assert(_.isString(dsConfig.identity) && dsConfig.identity, '`identity` should exist and be truthy in dsConfig!');

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
    var inventedUrl = '://';

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

    // Now attempt to parse out its pieces and validate each one.
    // TODO

    // If there were any non-standard options, we'll **LEAVE THEM IN** the URL
    // when we rebuild it below.  But we do fold them into the dsConfig
    // dictionary at the top level as well -- unless there is a conflict.
    // (If we find that there's a conflict, we freak out.)
    // TODO

    // Rebuild the URL.
    // var rebuiltUrl;TODO

    // Ensure a valid protocol.
    // TODO

    // If authentication credentials were specified in the url OR as overrides, use them.
    // (prefer overrides)
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
    // TODO

    // Now save our rebuilt URL as `url`.
    // TODO: uncomment
    // ```
    // dsConfig.url = rebuiltUrl;
    // ```

  }


};
