
MOCHA_OPTS= --check-leaks
REPORTER = dot

test: test-integration

test-integration:
	@NODE_ENV=test node test/integration/runner.js

test-load:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS) \
		test/load/**
