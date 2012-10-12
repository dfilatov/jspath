test:
	./node_modules/.bin/nodeunit test/test.js

benchmark: parser
	node benchmarks/parsing.js

.PHONY: test benchmark
