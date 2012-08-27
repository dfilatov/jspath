var cliff = require('cliff'),
    benchmark = require('benchmark'),
    parser = require('../lib/parser'),
    testPath = '.a..b.d[10][.test == "a" && (.a $= "test" || .b ^= 5) && (.test > .data || .test <= 56)][5:][23:56].test[.test === true][.b]',
    tests = {
        pegjs : function() {
            parser.parse(testPath);
        }
    },
    results = [],
    onSuiteCompleted = function() {
        console.log(cliff.stringifyObjectRows(
            results,
            ['name', 'mean time', 'ops/sec', 'elapsed time'],
            ['red', 'green', 'blue', 'yellow']
        ));
    },
    onTestCompleted = function(name) {
        results.push({
            'name'         : name,
            'mean time'    : (this.stats.mean * 1000).toFixed(3) + 'ms',
            'ops/sec'      : (1 / this.stats.mean).toFixed(0),
            'elapsed time' : this.times.elapsed + 's'
        });
    },
    suite = new benchmark.Suite('parsing', { onComplete : onSuiteCompleted });

Object.keys(tests).forEach(function(name) {
    var i = 0;
    suite.add(
        name,
        tests[name],
        {
            onStart    : function() {
                console.log('starts ' + name + '\n');
            },
            onCycle    : function() {
                console.log('\033[1A' + new Array(i++).join('.'));
            },
            onComplete : function() {
                onTestCompleted.call(this, name);
            }
        });
});

suite.run();