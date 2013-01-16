var cliff = require('cliff'),
    benchmark = require('benchmark'),
    fs = require('fs'),
    no = require('nommon'),
    //jpath = require('jpath'),
    //jsonpath = require('JSONPath'),
    jspath = require('../index'),
    data = JSON.parse(fs.readFileSync(__dirname + '/data.json', 'utf8')),
    tests = {
        '.objects.categoryId' : {
            'no.jpath'      : '.objects.categoryId',
           // 'artjock/jpath' : '.objects.categoryId',
            //'jsonpath'      : '$.objects[*].categoryId',
            'jspath'        : '.objects.categoryId'
        },
        '.objects.hotspots.id' : {
            'no.jpath'      : '.objects.hotspots.id',
            //'artjock/jpath' : '.objects.hotspots.id',
            //'jsonpath'      : '$.objects[*].hotspots[*].id',
            'jspath'        : '.objects.hotspots.id'
        },

        '.objects{.categoryId}' : {
            'no.jpath'      : '.objects[.categoryId]',
//            'artjock/jpath' : '.objects[.categoryId]',
//            'jsonpath'      : '$.objects[?(@.categoryId)]',
           'jspath'        : '.objects{.categoryId}'
        },

        '.objects{.categoryId === "adm"}' : {
            'no.jpath'      : '.objects[.categoryId == "adm"]',
//            'artjock/jpath' : '.objects[.categoryId == "adm"]',
//            'jsonpath'      : '$.objects[?(@.categoryId == "adm")]',
            'jspath'        : '.objects{.categoryId === "adm"}'
        },

        '.objects{.categoryId === "adm" || .geometry.type === "polygon"}' : {
            'no.jpath'      : '.objects[.categoryId == "adm" || .geometry.type == "polygon"]',
//            'artjock/jpath' : '.objects[.categoryId == "adm" || .geometry.type == "polygon"]',
//            'jsonpath'      : '$.objects[?(@.categoryId == "adm" || @.geometry.type == "polygon")]',
            'jspath'        : '.objects{.categoryId === "adm" || .geometry.type === "polygon"}'
        },

        '.objects[10]' : {
            'no.jpath'      : '.objects[10]',
//            'artjock/jpath' : '.objects[10]',
//            'jsonpath'      : '$.objects[10]',
            'jspath'        : '.objects[10]'
        }
    },
    testFns = {
        'no.jpath' : function(path) {
            no.jpath(path, data);
        },

        'artjock/jpath' : function(path) {
            jpath(data, path);
        },

        'jsonpath' : function(path) {
            jsonpath.eval(data, path);
        },

        'jspath' : function(path) {
            jspath.apply(path, data);
        }
    },
    results = [],
    onTestCompleted = function(name) {
        results.push({
            ''          : name,
            'mean time' : (this.stats.mean * 1000).toFixed(3) + 'ms',
            'ops/sec'   : (1 / this.stats.mean).toFixed(0)
        });
    };

Object.keys(tests).forEach(function(testName) {
    var suite = new benchmark.Suite(
            testName,
            {
                onStart : function() {
                    console.log('Starts \'' + testName + '\'\n');
                },

                onComplete : function() {
                    console.log(cliff.stringifyObjectRows(
                        results,
                        ['', 'mean time', 'ops/sec'],
                        ['red', 'green', 'blue']) + '\n');
                    results = [];
                }
            }),
        test = tests[testName];

    Object.keys(test).forEach(function(name) {
        var i = 0;
        suite.add(
            name,
            function() {
                testFns[name](test[name], data);
            },
            {
                onStart    : function() {
                    //console.log(name  + ' \n');
                },
                onCycle    : function() {
                    console.log('\033[1A' + new Array(i++).join('.'));
                },
                onComplete : function() {
                    console.log('');
                    onTestCompleted.call(this, name);
                }
            });
    });

    suite.run();
});
