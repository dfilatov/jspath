module.exports = {
    name : 'books and authors',
    info : {
        description : 'books about javascript',
        content : 'content'
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
        { name : 'Nicholas C. Zakas', skills : ['javascript', 'php'] },
        { name : 'Douglas Crockford' },
        { name : 'Robert C. Martin' },
        { name : 'John Resig' }
    ]
};