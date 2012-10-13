module.exports = [
    { path : '^.name', res : ['books and authors']},
    { path : '.name{^.name === "books and authors"}', res : ['books and authors']},
    { path : '.authors{.name === ^.books.author.name}.name', res : ['Nicholas C. Zakas', 'Douglas Crockford', 'Robert C. Martin']},
    { path : '.authors{!(.name === ^.books.author.name)}.name', res : ['John Resig']}
];