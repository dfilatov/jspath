var jspath = require('../index'),
    testData = require('./data'),
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

tests.forEach(function(testItem, i) {
    exports[i + 1 + '. ' + testItem.path] = function(test) {
        test.deepEqual(
            jspath.apply(
                testItem.path,
                'data' in testItem? testItem.data : testData,
                testItem.substs),
            testItem.res);
        test.done();
    };
});

exports['immutable data'] = function(test) {
    test.deepEqual(testData, testDataCopy);
    test.done();
};