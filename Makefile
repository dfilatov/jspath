parser:
	./node_modules/.bin/pegjs src/jpath.pegjs src/parser.js

test:
	./node_modules/.bin/nodeunit test

.PHONY: parser test
