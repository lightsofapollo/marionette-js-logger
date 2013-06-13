default: test

test/b2g:
	node setup.js

.PHONY: test
test: test/b2g
	./node_modules/mocha/bin/mocha --ui tdd
