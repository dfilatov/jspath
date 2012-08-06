module.exports = [
    { path : '@.info[@.description]', res : [{ description : 'books about javascript' }]},
    { path : '@.info[@.noexists]', res : []},
    { path : '@.books[@.favorite].idx', res : [1, 2]},
    { path : '@.books[@.author.name].idx', res : [0, 1, 2, 3, 4]},
    { path : '@.books[@.description.notes].idx', res : [3]},
    { path : '@.books[@.author.noexists].idx', res : []}
];