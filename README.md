# MongoAdapter

> Unreleased on npm, pending some more testing, but very nearly ready.  Let me know if you'd like to help test!  @mikermcneil on twitter.
> Thanks again to Ted Kulp.

Sails adapter for MongoDB.


## Installation
`npm install sails-mongo@git://github.com/balderdashy/sails-mongo.git`

## Configuration
Add the mongo URL to the config/adapters.js file:

    module.exports.adapters = {
      'default': 'mongo',

      mongo: {
        module   : 'sails-mongo',
        url      : 'mongodb://localhost:27017/sails'
        // url      : 'mongodb://user:pass@host.com:12345/sails_production'
      }
    };

## Sails.js
http://sailsjs.com

## About Waterline
Waterline is a new kind of storage and retrieval engine.  It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.
Waterline also comes with built-in transaction support, as well as a configurable environment setting. 
> NOTE: Waterline is currently in unreleased alpha-- that means it's not production ready!  If you want to use waterline in a production app, please contribute.  Currentliy, the plan is for an open alpha release early next year (2013).  Thanks!
You can learn more about

*Waterline repo: https://github.com/mikermcneil/waterline*

## Writing your own adapters
It's easy to add your own adapters for integrating with proprietary systems or existing open APIs.  For most things, it's as easy as `require('some-module')` and mapping the appropriate methods to match waterline semantics.

## Contributors
Thanks so much to Ted Kulp ([@tedkulp](https://twitter.com/tedkulp)) and Robin Persson ([@prssn](https://twitter.com/prssn)) for building this adapter.


## Sails.js License

### The MIT License (MIT)

Copyright © 2012-2013 Mike McNeil

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/a22d3919de208c90c898986619efaa85 "githalytics.com")](http://githalytics.com/mikermcneil/waterline)
