test:
	./node_modules/.bin/nodeunit test/test.js

benchmark:
	node benchmarks/comparison.js

min:
	node ./node_modules/uglify-js/bin/uglifyjs lib/jspath.js -o jspath.min.js -c -m

.PHONY: test benchmark min
