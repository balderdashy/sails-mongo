# sails-mongo Changelog

### 1.2.1

* [ENHANCEMENT] Adds `npm run start-mongodb` and `npm run stop-mongodb` scripts to start/stop a MongoDB docker instance [@luislobo](@luislobo)
* [ENHANCEMENT] Adds `npm run mongodb-shell` to run a MongoDB Shell CLI that connects to the MongoDB docker instance [@luislobo](@luislobo)
* [INTERNAL] Bump and pin dependency versions [@luislobo](@luislobo)
* [INTERNAL] Tests in Travis run against a combination of Node.js 10, 12, 14 and MongoDB: 3.6, 4.0, 4.2 [@luislobo](@luislobo)
* [INTERNAL] Refactors docker-compose.yml, removing the need of Dockerfile. Updates Docker node version to 12, and MongoDB to 4.2 [@luislobo](@luislobo)

### 1.2.0

* [ENHANCEMENT] Add support for `makeLikeModifierCaseInsensitive` meta key.  See [#470](https://github.com/balderdashy/sails-mongo/pull/470) for more details. Thanks [@anterodev](@anterodev)!

### 1.1.0

* [BUG] Fix issue with aggregation with MongoDB version >=3.4. Now the cursor option is mandatory. [@luislobo](@luislobo)

### 1.0.0

* [COMPATIBILITY] Upgrade to v1 of the Waterline adapter API.

### 0.12.2

* [INTERNAL] Bump and pin dependency versions
* [BUG] Update mongo driver version picking up patches fixes issue with ssl connectivity which was resolved in mongodb[2.1.20]. See [#425](https://github.com/balderdashy/sails-mongo/issues/435) for more details.

### 0.12.1

* [ENHANCEMENT] Sets the `reconnectInterval` to the mongo default and adds a `reconnectTries` configuration option. See [#118](https://github.com/balderdashy/sails-mongo/issues/118) for more details. Thanks [@luislobo](@luislobo) for the patch!

### 0.12.0

* [ENHANCEMENT] Now exposes a flag `wlNext` that allows you to toggle the case sensitivity of a string query. See [#380](https://github.com/balderdashy/sails-mongo/pull/380) and [#238](https://github.com/balderdashy/sails-mongo/pull/238) for more. Thanks [@nicoespeon](@nicoespeon).

### 0.11.7

* [ENHANCEMENT] When running an update only return `_id` values when doing the initial lookup. See [#237](https://github.com/balderdashy/sails-mongo/pull/237) for more. Thanks [@andyhu](@andyhu).

* [ENHANCEMENT] Better error message for duplicate keys when using Wired Tiger. See [#372](https://github.com/balderdashy/sails-mongo/pull/372) for more. Thanks [@Mordred](@Mordred).

* [ENHANCEMENT] Allow multi-line queries when using `contains`, `like`, `startsWith`, and `endsWith`. See [#308](https://github.com/balderdashy/sails-mongo/pull/308) for more. Thanks [@vbud](@vbud).

* [BUG] Fix issue when returning results with the key `_id` that are not actual ObjectId instances. See [#356](https://github.com/balderdashy/sails-mongo/pull/356) for more. Thanks [@miccar](@miccar).

* [STABILITY] Locked the dependency versions down.

---
[@anterodev]: https://github.com/anterodev
[@luislobo]: https://github.com/luislobo
[@nicoespeon]: https://github.com/nicoespeon
[@andyhu]: https://github.com/andyhu
[@Mordred]: https://github.com/Mordred
[@vbud]: https://github.com/vbud
[@miccar]: https://github.com/miccarr
