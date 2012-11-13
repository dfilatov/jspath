test:
	./node_modules/.bin/nodeunit test/test.js

benchmark:
	node benchmarks/comparison.js

.PHONY: test benchmark
