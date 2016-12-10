[![](https://camo.githubusercontent.com/9e49073459ed4e0e2687b80eaf515d87b0da4a6b/687474703a2f2f62616c64657264617368792e6769746875622e696f2f7361696c732f696d616765732f6c6f676f2e706e67)](http://sailsjs.com)

# sails-mongo
[![npm version](https://badge.fury.io/js/sails-mongo.svg)](http://badge.fury.io/js/sails-mongo)

Sails.js/Waterline adapter for MongoDB.


> **Heads up**
>
> `sails-mongo` maps the logical `id` attribute to the required `_id` physical-layer mongo id.
> In the current version of `sails-mongo`, you **should not** sort by `id`.


## Installation

Install from NPM.

```bash
$ npm install sails-mongo --save
```

## Usage

> Note: The following instructions are for apps using at least Sails v0.10.x, up through v0.12.x.
> + For help with legacy versions of Sails, see [#Legacy Usage](#Legacy-usage) below.
> + To use sails-mongo with the Sails v1 / Waterline 0.13 prerelease, see [the 1.0 branch of sails-docs](https://github.com/balderdashy/sails-docs/tree/1.0).


After installing this adapter as a dependency of your Sails app, make this particular Mongo database your default datastore by adding the following settings to the files in your config folder:


```javascript
// config/connections.js
module.exports.connections = {

  localMongoDb: {
    adapter: 'sails-mongo',
    host: 'localhost', // defaults to `localhost` if omitted
    port: 27017, // defaults to 27017 if omitted
    user: 'username_here', // or omit if not relevant
    password: 'password_here', // or omit if not relevant
    database: 'database_name_here' // or omit if not relevant
  }

};
```

```js
// config/models.js
module.exports.models = {
  'connection': 'localMongoDb'
};
```

> For more information about configuring datastores in your Sails app, click [here](http://sailsjs.com/documentation/reference/config/sails-config-connections).

#### What about production?
In production, use config/env/production.js and/or environment variables.

> For more about getting your Sails app ready for production, see [**Concepts > Deployment**](http://sailsjs.com/documentation/concepts/deployment).


## Bugs &nbsp; [![NPM version](https://badge.fury.io/js/sails-mongo.svg)](http://npmjs.com/package/sails-mongo)

To report a bug, [click here](http://sailsjs.com/bugs).


## Help

If you have questions or need help, click [here](http://sailsjs.com/support).


## FAQ

#### What about MongoDB urls?

You can follow [MongoDB URI Connection Settings](https://docs.mongodb.com/manual/reference/connection-string/) specification on how to define a connection string URI.

Following there is an example on how to configure the connection to your MongoDB server using a URL. e.g.:

```js
module.exports.connections = {

  localMongoDb: {
    adapter: 'sails-mongo',
    url: 'mongodb://heroku_12345678:random_password@ds029017.mLab.com:29017/heroku_12345678'
  }
};
```
You could also use an environment variable, to ease your deployments, for example, to [Heroku](https://devcenter.heroku.com/articles/mongolab#getting-your-connection-uri) , as follows:

```js
module.exports.connections = {

  localMongoDb: {
    adapter: 'sails-mongo',
    url: process.env.MONGODB_URI
  }
};
```

This would be useful if, for instance, your Heroku env variables looked like:

```bash
MONGODB_URI=mongodb://heroku_12345678:random_password@ds029017.mLab.com:29017/heroku_12345678
```

It must be noted though, that if you provide a `url` configuration, then, `database`, `user`, `password`, `host` and `port` configuration options are ignored.


#### What about a MongoDB deployment that is part of a Replica Set?

For example:

```bash
MONGODB_URI=mongodb://mongodbserver01:27017,mongodbserver02:27017,mongodbserver03:27017/my-app-datatabase?replSet=my-replica-set-name&readPreference=nearest&slaveOk=true
```

The previous configuration will set three MongoDB servers, named `mongodbserver01`, `mongodbserver02` and `mongodbserver03`, all using port `27017`, connecting to the `my-app-database` and using `my-replica-set-name` as the replica set. It also sets the `readPreference` to `nearest` and allows slave connections, with `slaveOk` set to `true`



## Legacy usage

####Using with Sails v0.9.x

Add the mongo config to the `config/adapters.js` file.

```javascript
module.exports.adapters = {
  'default': 'mongo',

  mongo: {
    module: 'sails-mongo',
    host: 'localhost',
    port: 27017,
    user: 'username',
    password: 'password',
    database: 'your mongo db name here',
    wlNext: {
      caseSensitive: false
    }
  }
};
```

*Note: You can also use the old `v0.8.x` syntax as well, see next section for details.*

Replication/Replica Set can be setup by adding the following options to the `mongo` object,
with your own replica details specified:

```javascript
replSet: {
  servers: [
    {
      host: 'secondary1.localhost',
      port: 27017 // Will override port from default config (optional)
    },
    {
      host: 'secondary2.localhost',
      port: 27017
    }
  ],
  options: {} // See http://mongodb.github.io/node-mongodb-native/api-generated/replset.html (optional)
}
```

*Note: Replica set configuration is optional.*

#### Using with Sails v0.8.x

```javascript
module.exports.adapters = {
  'default': 'mongo',

  mongo: {
    module: 'sails-mongo',
    url: 'mongodb://USER:PASSWORD@HOST:PORT/DB'
  }
};
```

> Don't forget that Mongo uses the ObjectId type for ids.



## Contributing &nbsp; [![Dependency Status](https://david-dm.org/balderdashy/sails-mongo.svg)](https://david-dm.org/balderdashy/sails-mongo) &nbsp; [![Build Status](https://travis-ci.org/balderdashy/sails-mongo.svg?branch=master)](https://travis-ci.org/balderdashy/sails-mongo) &nbsp; [![Build status on Windows](https://ci.appveyor.com/api/projects/status/u0i1o62tsw6ymbjd/branch/master?svg=true)](https://ci.appveyor.com/project/mikermcneil/sails-mongo/branch/master)

Please observe the guidelines and conventions laid out in the [Sails project contribution guide](http://sailsjs.com/contribute) when opening issues or submitting pull requests.

[![NPM](https://nodei.co/npm/sails-mongo.png?downloads=true)](http://npmjs.com/package/sails-mongo)


#### Special thanks

Thanks so much to Ted Kulp ([@tedkulp](https://twitter.com/tedkulp)) and Robin Persson ([@prssn](https://twitter.com/prssn)) for building the first version of this adapter back in 2013.  Since then, it has evolved into a core adapter within the framework.



## License

MIT

&copy; 2013 Ted Kulp, Robin Persson, Cody Stoltman, Mike McNeil, Balderdash Design Co.
&copy; 2014 Balderdash Design Co.
&copy; 2015-2016 The Treeline Co.

Like the [Sails framework](http://sailsjs.com), this adapter is free and open-source under the [MIT License](http://sailsjs.com/license).

