module.exports = [
    { path : '.books{.price > 10}{.price < 20}.idx', res : [0, 3]},
    { path : '.books[1:]{.price > 10}{.price < 20}.idx', res : [3]},
    { path : '.books{.price > 10}[0].idx', res : [0] },
    { path : '.books.idx[0]{. === 0}', res : 0 }
];
