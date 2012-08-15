module.exports = [
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
    { path : '@.books[1..][0].idx', res : [1]},
    { path : '@.booksCount[10][10].idx', res : []}
];