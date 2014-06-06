![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# MongoAdapter

Waterline adapter for MongoDB.

> **Warning**
>
> `sails-mongo` maps the logical `id` attribute to the required `_id` physical-layer mongo id.
> In the current version of `sails-mongo`, you **should not** sort by `id`.

## Installation

Install from NPM.

```bash
$ npm install sails-mongo --save
```

## Sails Configuration

Add the mongo config to the `config/adapters.js` file.

### Using with Sails v0.9.x

```javascript
module.exports.adapters = {
  'default': 'mongo',

  mongo: {
    module: 'sails-mongo',
    host: 'localhost',
    port: 27017,
    user: 'username',
    password: 'password',
    database: 'your mongo db name here'
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

### Using with Sails v0.8.x

```javascript
module.exports.adapters = {
  'default': 'mongo',

  mongo: {
    module: 'sails-mongo',
    url: 'mongodb://USER:PASSWORD@HOST:PORT/DB'
  }
};
```

Don't forget that Mongo uses the ObjectId type for ids.

## Sails.js

http://sailsjs.org

## Waterline

[Waterline](https://github.com/balderdashy/waterline) is a brand new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get users, whether they live in MySQL, LDAP, MongoDB, or Facebook.


## Contributors

Thanks so much to Ted Kulp ([@tedkulp](https://twitter.com/tedkulp)) and Robin Persson ([@prssn](https://twitter.com/prssn)) for building this adapter.


## Sails.js License

### The MIT License (MIT)

Copyright © 2012-2013 Mike McNeil

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/a22d3919de208c90c898986619efaa85 "githalytics.com")](http://githalytics.com/mikermcneil/sails-mongo)
