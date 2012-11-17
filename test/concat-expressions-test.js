module.exports = [
    { path : '.(.name | .booksCount)', res : ['books and authors', 5]},
    { path : '.books(.idx{. === 1} | .idx{. === 2})', res : [1, 2]},
    { path : '.books(.idx{. === 3} | .author[0].name)', res : [3, 'Robert C. Martin']}
];