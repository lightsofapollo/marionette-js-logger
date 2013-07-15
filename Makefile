default: test

test/b2g:
	./node_modules/marionette-host-environment/bin/marionette-host-environment $@

.PHONY: test
test: test/b2g
	./node_modules/.bin/mocha

.PHONY: ci
ci:
	nohup Xvfb :99 &
	DISPLAY=:99 make test
