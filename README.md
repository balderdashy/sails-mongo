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


#### Special thanks

Thanks so much to Ted Kulp ([@tedkulp](https://twitter.com/tedkulp)) and Robin Persson ([@prssn](https://twitter.com/prssn)) for building the first version of this adapter back in 2013.  Since then, it has evolved into a core adapter within the framework.


## Bugs &nbsp; [![NPM version](https://badge.fury.io/js/sails-mongo.svg)](http://npmjs.com/package/sails-mongo)

To report a bug, [click here](http://sailsjs.com/bugs).



## License

This [core adapter](http://sailsjs.com/documentation/concepts/extending-sails/adapters/available-adapters) is available under the **MIT license**.

As for [Waterline](http://waterlinejs.org) and the [Sails framework](http://sailsjs.com)?  They're free and open-source under the [MIT License](http://sailsjs.com/license).

&copy; [The Sails Co.](http://sailsjs.com/about)

![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)
