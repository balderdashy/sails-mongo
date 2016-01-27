# Sails-Mongo Changelog

### 0.12.0

* [ENHANCEMENT] Now exposes a flag `wlNext` that allows you to toggle the case sensitivity of a string query. See [#380](https://github.com/balderdashy/sails-mongo/pull/380) and [#238](https://github.com/balderdashy/sails-mongo/pull/238) for more. Thanks [@nicoespeon](https://github.com/nicoespeon).

### 0.11.7

* [ENHANCEMENT] When running an update only return `_id` values when doing the initial lookup. See [#237](https://github.com/balderdashy/sails-mongo/pull/237) for more. Thanks [@andyhu](https://github.com/andyhu).

* [ENHANCEMENT] Better error message for duplicate keys when using Wired Tiger. See [#372](https://github.com/balderdashy/sails-mongo/pull/372) for more. Thanks [@Mordred](https://github.com/Mordred).

* [ENHANCEMENT] Allow multi-line queries when using `contains`, `like`, `startsWith`, and `endsWith`. See [#308](https://github.com/balderdashy/sails-mongo/pull/308) for more. Thanks [@vbud](https://github.com/vbud).

* [BUG] Fix issue when returning results with the key `_id` that are not actual ObjectId instances. See [#356](https://github.com/balderdashy/sails-mongo/pull/356) for more. Thanks [@miccar](https://github.com/miccarr).

* [STABILITY] Locked the dependency versions down.
