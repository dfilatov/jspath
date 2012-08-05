var jpath = require('../src/jspath'),
    testData = {
        name : 'books and authors',
        info : {
            description : 'books about javascript'
        },
        booksCount : 5,
        books : [
            {
                idx : 0,
                name : 'Clean Code',
                author : { name : 'Robert C. Martin' },
                keywords : ['code', 'refactoring'],
                price : 17.96,
                oldPrices : [10, 15]
            },
            {
                idx : 1,
                favorite : true,
                name : 'Maintainable JavaScript',
                author : { name : 'Nicholas C. Zakas' },
                keywords : ['javascript', 'code', 'patterns'],
                price : 10,
                oldPrices : [20, 10, 5]
            },
            {
                idx : 2,
                name : 'Agile Software Development',
                favorite : false,
                author : { name : 'Robert C. Martin' },
                keywords : ['agile', 'c#'],
                price : 20,
                oldPrices : []
            },
            {
                idx : 3,
                name : 'JavaScript: The Good Parts',
                author : { name : 'Douglas Crockford' },
                keywords : ['javascript', 'code'],
                description : {
                    notes : 'must read'
                },
                price : 15.67,
                oldPrices : [12.23, 15]
            },
            {
                idx : 4,
                name : 'JavaScript: The Good Parts',
                author : { name : 'Douglas Crockford' },
                keywords : ['javascript', 'code'],
                price : 25,
                oldPrices : [50, 30.33, 27]
            }
        ],
        authors : [
            { name : 'Nicholas C. Zakas' },
            { name : 'Douglas Crockford' },
            { name : 'Robert C. Martin' },
            { name : 'John Resig' }
        ]
    },
    tests = [
        { path : '@', res : [testData] },
        { path : '@', data : [{ test : 'test' }], res : [{ test : 'test' }]},
        { path : '@', data : 'test', res : ['test']},
        { path : '@', data : 5, res : [5]},
        { path : '@', data : true, res : [true]},
        { path : '@', data : null, res : [null]},
        { path : '@', data : undefined, res : [undefined]},
        { path : '@.name', res : ['books and authors']},
        { path : '@.noexists', res : []},
        { path : '@."test.test"', data : { 'test.test' : 'test' }, res : ['test']},
        { path : '@.authors.name', res : ['Nicholas C. Zakas', 'Douglas Crockford', 'Robert C. Martin', 'John Resig']},
        { path : '@.books.author.name', res : ['Robert C. Martin', 'Nicholas C. Zakas', 'Robert C. Martin', 'Douglas Crockford', 'Douglas Crockford']},
        { path : '@.info[@.description]', res : [{ description : 'books about javascript' }]},
        { path : '@.info[@.noexists]', res : []},
        { path : '@.books[@.favorite].idx', res : [1, 2]},
        { path : '@.books[@.author.name].idx', res : [0, 1, 2, 3, 4]},
        { path : '@.books[@.description.notes].idx', res : [3]},
        { path : '@.books[@.author.noexists].idx', res : []},
        { path : '@.books[0].idx', res : [0]},
        { path : '@.books[2].idx', res : [2]},
        { path : '@.books[6].idx', res : []},
        { path : '@.books[-1].idx', res : [4]},
        { path : '@.books[2..].idx', res : [2, 3, 4]},
        { path : '@.books[10..].idx', res : []},
        { path : '@.books[-2..].idx', res : [3, 4]},
        { path : '@.books[1..3].idx', res : [1, 2]},
        { path : '@.books[10..20].idx', res : []},
        { path : '@.books[2..-1].idx', res : [2, 3]},
        { path : '@.books[-3..-1].idx', res : [2, 3]},
        { path : '@.books[..2].idx', res : [0, 1]},
        { path : '@.books[..-2].idx', res : [0, 1, 2]},
        { path : '@.books[..0].idx', res : []},
        { path : '@.books[@.author.name == "Robert C. Martin"].idx', res : [0, 2]},
        { path : '@.books[@.author.name == "John Resig"]', res : []},
        { path : '@.books[@.favorite === true].idx', res : [1]},
        { path : '@.books[@.idx != "1"].idx', res : [0, 2, 3, 4]},
        { path : '@.books[@.idx !== "1"].idx', res : [0, 1, 2, 3, 4]},
        { path : '@.books[@.name ^= "JavaScript"].idx', res : [3, 4]},
        { path : '@.books[@.name ^= "Javascript"].idx', res : []},
        { path : '@.books[@.name $= "JavaScript"].idx', res : [1]},
        { path : '@.books[@.name *= "Javascript"].idx', res : []},
        { path : '@.books[@.name *= "JavaScript"].idx', res : [1, 3, 4]},
        { path : '@.booksCount[@ > 4]', res : [5]},
        { path : '@.booksCount[@ > 10]', res : []},
        { path : '@.booksCount[@ >= 5]', res : [5]},
        { path : '@.booksCount[@ == 5]', res : [5]},
        { path : '@.booksCount[@ === "5"]', res : []},
        { path : '@.booksCount[@ === 5]', res : [5]},
        { path : '@.books[@.price > 16].idx', res : [0, 2, 4]},
        { path : '@.books[@.price > 17.97].idx', res : [2, 4]},
        { path : '@.books[@.price < 16].idx', res : [1, 3]},
        { path : '@.books[@.price == 10].idx', res : [1]},
        { path : '@.books[@.price <= 10].idx', res : [1]},
        { path : '@.books[@.price >= 10].idx', res : [0, 1, 2, 3, 4]},
        { path : '@.books[@.price > 10][@.price < 20].idx', res : [0, 3]},
        { path : '@.books[1..][@.price > 10][@.price < 20].idx', res : [3]},
        { path : '@.books[@.price > 10][0].idx', res : [0]},
        { path : '@.books[@.oldPrices > @.price].idx', res : [1, 4]},
        { path : '@.books[@.oldPrices === @.price].idx', res : [1]},
        { path : '@.books[@.keywords === "javascript"].idx', res : [1, 3 ,4]},
        { path : '@.books[@.keywords === "javascript" || @.keywords === "c#"].idx', res : [1, 2, 3, 4]},
        { path : '@.books[@.keywords === "javascript" || @.keywords === "c#" || @.keywords === "code"].idx', res : [0, 1, 2, 3, 4]},
        { path : '@.books[@.keywords === "javascript" && @.keywords === "code"].idx', res : [1, 3, 4]},
        { path : '@.books[@.keywords === "javascript" && @.keywords === "code" && @.keywords === "patterns"].idx', res : [1]},
        { path : '@.books[!@.description].idx', res : [0, 1, 2, 4]},
        { path : '@.books[!@.description && @.keywords == "refactoring"].idx', res : [0]},
        { path : '@.books[!@.description || !(@.price > 15)].idx', res : [0, 1, 2, 4]},
        { path : '@.books[@.description || @.price > 15 && @.keywords == "javascript"].idx', res : [3, 4]},
        { path : '@.books[(@.keywords === "javascript" && @.keywords === "patterns") || @.keywords === "agile"].idx', res : [1, 2]},
        { path : '@.books[(@.keywords === "javascript" || @.keywords === "code") && @.favorite === true].idx', res : [1]},
        { path : '@.books[!(@.keywords === "javascript")].idx', res : [0, 2]},
        { path : '@..name', res : [
            'books and authors', 'Clean Code', 'Robert C. Martin', 'Maintainable JavaScript',
            'Nicholas C. Zakas', 'Agile Software Development', 'Robert C. Martin', 'JavaScript: The Good Parts',
            'Douglas Crockford', 'JavaScript: The Good Parts', 'Douglas Crockford', 'Nicholas C. Zakas',
            'Douglas Crockford', 'Robert C. Martin', 'John Resig'
            ]},
        { path : '@.books[@..name[@ === "Douglas Crockford"]].idx', res : [3, 4]},
        { path : '@..object', data : { object : { object : { object : 'object' }}}, res : [
                { object : { object : 'object' }},
                { object : 'object' },
                'object'
            ]}
    ];

tests.forEach(function(testItem, i) {
    exports[i + 1 + '. ' + testItem.path] = function(test) {
        test.deepEqual(jpath.apply(testItem.path, 'data' in testItem? testItem.data : testData), testItem.res);
        test.done();
    };
});