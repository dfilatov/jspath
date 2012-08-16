module.exports = [
    { path : '..name', res : [
        'books and authors', 'Clean Code', 'Robert C. Martin', 'Maintainable JavaScript',
        'Nicholas C. Zakas', 'Agile Software Development', 'Robert C. Martin', 'JavaScript: The Good Parts',
        'Douglas Crockford', 'JavaScript: The Good Parts', 'Douglas Crockford', 'Nicholas C. Zakas',
        'Douglas Crockford', 'Robert C. Martin', 'John Resig'
        ]},
    { path : '.books[..name[@ === "Douglas Crockford"]].idx', res : [3, 4]},
    {
        path : '..object',
        data : { object : { object : { object : 'object' }, arr : [[{ object : 'arr-object' }]]}},
        res : [
            { object : { object : 'object' }, arr : [[{ object : 'arr-object' }]]},
            { object : 'object' },
            'object',
            'arr-object'
        ]
    }
];