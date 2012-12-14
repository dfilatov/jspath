var jspath = require('../index'),
    testCounter = 0;

// parser tests
require('./parser-errors-test').forEach(function(desc) {
    exports[++testCounter + '. ' + desc.path] = function(test) {
        test.throws(
            function() {
                jspath.apply(desc.path, {});
            },
            function(err) {
                return err.message === desc.message;
            });
        test.done();
    };
});


// applying tests
var testData = require('./data'),
    testDataCopy = JSON.parse(JSON.stringify(testData)),
    tests = [
            'path',
            'descendants',
            'object-predicates',
            'positional-predicates',
            'multi-predicates',
            'comparison-operators',
            'arithmetic-operators',
            'logical-expressions',
            'concat-expressions',
            'undefined-and-null',
            'root',
            'substs'
        ].reduce(
            function(tests, name) {
                return tests.concat(require('./' + name + '-test'));
            },
            []);


tests.forEach(function(testItem) {
    exports[++testCounter + '. ' + testItem.path] = function(test) {
        test.deepEqual(
            jspath(
                testItem.path,
                'data' in testItem? testItem.data : testData,
                testItem.substs),
            testItem.res);
        test.done();
    };
});

exports[++testCounter + '. jspath.apply should be alias to jspath'] = function(test) {
    test.strictEqual(jspath, jspath.apply);
    test.done();
};

// immutable test
exports[++testCounter + '. immutable data'] = function(test) {
    test.deepEqual(testData, testDataCopy);
    test.done();
};