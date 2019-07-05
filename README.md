[![Node.js and MongoDB on Sails.js/Waterline](https://camo.githubusercontent.com/9e49073459ed4e0e2687b80eaf515d87b0da4a6b/687474703a2f2f62616c64657264617368792e6769746875622e696f2f7361696c732f696d616765732f6c6f676f2e706e67)](http://sailsjs.com)

# sails-mongo

Sails.js/Waterline adapter for MongoDB.

> Provides easy access to MongoDB from Sails.js & Waterline.
> This module is a Sails/Waterline adapter maintained by the core team.  Its goal is to provide robust, easy-to-use access to MongoDB from Sails.js and Waterline.
>
> As an adapter, this module implements a set of declarative interfaces, conventions, and best-practices for integrating with Mongo databases.
> Strict adherence to an adapter specification enables the (re)use of built-in generic test suites, standardized documentation, reasonable expectations around the API for your users, and overall, a more pleasant development experience for everyone.


## Installation

To install this adapter, run:

```bash
$ npm install sails-mongo
```

Then [connect the adapter](http://sailsjs.com/documentation/reference/configuration/sails-config-datastores) to one or more of your app's datastores.

## Usage

Visit [Models & ORM](http://sailsjs.com/docs/concepts/models-and-orm) in the docs for more information about using models, datastores, and adapters in your app/microservice.

## 2.x BREAKING CHANGES

#### MongoDB Driver
From `sails-mongo` version 2.0.0 and above, the adapter uses [MongoDB 3.2.x](https://www.npmjs.com/package/mongodb). 
This driver changes the way it handles connections, and implements the concept of [MongoClient](https://mongodb.github.io/node-mongodb-native/3.2/api/MongoClient.html).

Because of that, `manager` now returns MongoClient, instead of just a connection.

This adds a lot more flexibility and enables the use of the latest MongoDB improvements, like [ClientSession](https://mongodb.github.io/node-mongodb-native/3.2/api/ClientSession.html),
and with it, transactions, change streams, and other new features.

#### Access to MongoDB native Database object
If you need to get the database, you have to call the [`db`](http://mongodb.github.io/node-mongodb-native/3.2/api/MongoClient.html#db) function on the manager (MongoClient):
```javascript
Pet.getDatastore().manager.db('test')
```

#### `.native` still works but is marked as deprecated

Basically, replace this kind of code:

```javascript
Pet.native(function (err, collection) {
  if (err) {
    return res.serverError(err);
  }

  collection.find({}, {
    name: true
  }).toArray(function (err, results) {
    if (err) {
      return res.serverError(err);
    }
    res.ok(results);
  });
});
```

with: 

```javascript
try {
  const results = await Pet.getDatastore().manager.db('test')
    .collection('pet')
    .find({}, { name: 1 })
    .toArray();
  res.ok(results);
} catch (err) {
  res.serverError(err);
}
```

## Configuration options
This version uses (MongoDB 3.2.x connection options)[http://mongodb.github.io/node-mongodb-native/3.2/api/MongoClient.html#.connect].

New/updated options:
 - `authMechanism`: Mechanism for authentication: MDEFAULT, GSSAPI, PLAIN, MONGODB-X509, or SCRAM-SHA-1
 - `autoReconnect`: Defaults to `true`
 - `compression`: Type of compression to use: snappy or zlib
 - `fsync`: Defaults to `false`. Specify a file sync write concern
 - `keepAliveInitialDelay`: Defaults to `30000`. The number of milliseconds to wait before initiating keepAlive on the TCP socket
 - `minSize`: If present, the connection pool will be initialized with minSize connections, and will never dip below minSize connections
 - `numberOfRetries`: The number of retries for a tailable cursor (defaults to 5)
 - `readPreferenceTags`: Read preference tags
 - `sslValidate`: Defaults to `true`. Validate mongod server certificate against Certificate Authority

#### Warnings

`keepAlive` is now a boolean, and `keepAliveInitialDelay` takes the value that the old `keepAlive` used to use.

Check the MongoDB module documentation for more details.

## Roadmap

#### NEXT FEATURES TO BE IMPLEMENTED
- Support multiple protocols. Right now, the adapter validates/checks that the protocol is equal to `mongodb`, as described in the (connection string)[https://docs.mongodb.com/manual/reference/connection-string/] MongoDB documentation.
  Since MongoDB 3.6, the protocol can be `mongodb+srv`, allowing for (DNS Seedlist Connection)[https://docs.mongodb.com/manual/reference/connection-string/#dns-seedlist-connection-format] format.
  It needs to be added to support MongoDB Atlas.
- Built-in transactions

## Compatibility

This adapter implements the following methods:

| Method               | Status            | Layer         |
|:---------------------|:------------------|:--------------|
| ~~registerDatastore~~| ~~Implemented~~   | _N/A_         |
| ~~teardown~~         | ~~Implemented~~   | _N/A_         |
| validateModelDef     | Implemented       | Modeled       |
| createRecord         | Implemented       | Modeled (DML) |
| createEachRecord     | Implemented       | Modeled (DML) |
| updateRecords        | Implemented       | Modeled (DML) |
| destroyRecords       | Implemented       | Modeled (DML) |
| findRecords          | Implemented       | Modeled (DQL) |
| join                 | _not supported_   | Modeled (DQL) |
| countRecords         | Implemented       | Modeled (DQL) |
| sumRecords           | Implemented       | Modeled (DQL) |
| avgRecords           | Implemented       | Modeled (DQL) |
| definePhysicalModel  | Implemented       | Migratable    |
| dropPhysicalModel    | Implemented       | Migratable    |
| setPhysicalSequence  | _not supported_   | Migratable    |


## Questions?

See [Extending Sails > Adapters > Custom Adapters](http://sailsjs.com/documentation/concepts/extending-sails/adapters/custom-adapters) in the [Sails documentation](http://sailsjs.com/documentation), or check out [recommended support options](http://sailsjs.com/support).


## Contributing &nbsp; [![Build Status](https://travis-ci.org/balderdashy/sails-mongo.svg?branch=master)](https://travis-ci.org/balderdashy/sails-mongo) &nbsp; [![Build status on Windows](https://ci.appveyor.com/api/projects/status/u0i1o62tsw6ymbjd/branch/master?svg=true)](https://ci.appveyor.com/project/mikermcneil/sails-mongo/branch/master)

Please observe the guidelines and conventions laid out in the [Sails project contribution guide](http://sailsjs.com/documentation/contributing) when opening issues or submitting pull requests.

[![NPM](https://nodei.co/npm/sails-mongo.png?downloads=true)](http://npmjs.com/package/sails-mongo)

#### Setting up the development environment
To ease development, this module uses Docker. It uses an image of MongoDB 4.

Included is a Docker Compose file that helps setting up the environment needed to develop and run the test.

To start a MongoDB instance, use `npm run start-mongodb`. It will start a docker instance with MongoDB running,
in detached mode (in the background). It will be running until you stop the instance. 

To stop the MongoDB instance, use `npm run stop-mongodb`. 

Once you have MongoDB running, you can just run `npm test` as usual.

To get a shell to the MongoDB docker instance running, you can use `npm run mongodb-shell`.

To do a one single run of the tests, without starting your own MongoDB instance, use `npm run docker-test`.


#### Special thanks

Thanks so much to Ted Kulp ([@tedkulp](https://twitter.com/tedkulp)) and Robin Persson ([@prssn](https://twitter.com/prssn)) for building the first version of this adapter back in 2013.  Since then, it has evolved into a core adapter within the framework.


## Bugs &nbsp; [![NPM version](https://badge.fury.io/js/sails-mongo.svg)](http://npmjs.com/package/sails-mongo)

To report a bug, [click here](http://sailsjs.com/bugs).


## License

This [core adapter](http://sailsjs.com/documentation/concepts/extending-sails/adapters/available-adapters) is available under the **MIT license**.

As for [Waterline](http://waterlinejs.org) and the [Sails framework](http://sailsjs.com)?  They're free and open-source under the [MIT License](http://sailsjs.com/license).

&copy; [The Sails Co.](http://sailsjs.com/about)

![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)
