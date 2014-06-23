
MOCHA_OPTS= --check-leaks --timeout 30000
REPORTER = dot

test: test-unit test-integration

test-integration:
	echo 'DROPPING ALL COLLECTIONS IN "sails-mongo"'
	mongo sails-mongo --eval 'db.dropDatabase()'
	echo 'Running integration tests...'
	@NODE_ENV=test node test/integration/runner.js

test-unit:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS) \
		test/unit/**

test-load:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS) \
		test/load/**
