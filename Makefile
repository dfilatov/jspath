test:
	./node_modules/.bin/nodeunit test/test.js

test-ts:
	./node_modules/.bin/tsc --strict --noEmit index.d.ts

benchmark:
	node benchmarks/comparison.js

min:
	node ./node_modules/uglify-js/bin/uglifyjs lib/jspath.js -o jspath.min.js -c -m

.PHONY: test test-ts benchmark min
