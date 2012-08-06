parser:
	./node_modules/.bin/pegjs src/jspath.pegjs lib/parser.js

test: parser
	./node_modules/.bin/nodeunit test

.PHONY: parser test
