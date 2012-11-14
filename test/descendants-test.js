module.exports = [
    { path : '..', data : [[[['a'], { b : 'b' }]], 'c'], res : ['a', { b : 'b' }, 'b', 'c']},
    { path : '..id', res : [1, 2], data : [[[[{ id : 1, data : [[[{ id : 2 }]]]}]]]]},
    { path : '..name', res : [
        'books and authors', 'Clean Code', 'Robert C. Martin', 'Maintainable JavaScript',
        'Nicholas C. Zakas', 'Agile Software Development', 'Robert C. Martin', 'JavaScript: The Good Parts',
        'Douglas Crockford', 'JavaScript: The Good Parts', 'Douglas Crockford', 'Nicholas C. Zakas',
        'Douglas Crockford', 'Robert C. Martin', 'John Resig'
        ]},
    { path : '.books{..name{. === "Douglas Crockford"}}.idx', res : [3, 4]},
    {
        path : '..',
        data : { object : { object : { object : 'object' }, arr : [[{ object : ['arr-object', { arr : 'object' }] }]]}},
        res : [
            { object : { object : { object : 'object' }, arr : [[{ object : ['arr-object', { arr : 'object' }] }]]}},
            { object : { object : 'object' }, arr : [[{ object : ['arr-object', { arr : 'object' }] }]]},
            { object : 'object' },
            'object',
            { object : ['arr-object', { arr : 'object' }] },
            'arr-object',
            { arr : 'object' },
            'object'
        ]
    },
    {
        path : '..object',
        data : { object : { object : { object : 'object' }, arr : [[{ object : 'arr-object' }]]}},
        res : [
            { object : { object : 'object' }, arr : [[{ object : 'arr-object' }]]},
            { object : 'object' },
            'object',
            'arr-object'
        ]
    },
    {
        path : '.authors..',
        res :  [
            { name : 'Nicholas C. Zakas', skills : ['javascript', 'php'] },
            'Nicholas C. Zakas',
            'javascript',
            'php',
            { name : 'Douglas Crockford' },
            'Douglas Crockford',
            { name : 'Robert C. Martin' },
            'Robert C. Martin',
            { name : 'John Resig' },
            'John Resig'
        ]
    },
    {
        path : '.authors..*',
        res : [
            'Nicholas C. Zakas',
            'javascript',
            'php',
            'Douglas Crockford',
            'Robert C. Martin',
            'John Resig'
        ]
    }
];