var jpath = require('../index'),
    testData = require('./data'),
    tests = [
            'path',
            'descendants',
            'object-predicates',
            'array-predicates',
            'multi-predicates',
            'operators',
            'logical-expressions'
        ].reduce(
            function(tests, name) {
                return tests.concat(require('./' + name + '-test'));
            },
            []);

tests.forEach(function(testItem, i) {
    exports[i + 1 + '. ' + testItem.path] = function(test) {
        test.deepEqual(jpath.apply(testItem.path, 'data' in testItem? testItem.data : testData), testItem.res);
        test.done();
    };
});