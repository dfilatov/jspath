module.exports = [
    { path : '.{.{.}}', data : 'test', res : ['test']},
    { path : '.{.data}', data : { data : 0 }, res : [{ data : 0 }]},
    { path : '.{.data}', data : { data : false }, res : [{ data : false }]},
    { path : '.{.data}', data : [{ data : false }], res : [{ data : false }]},
    { path : '.', data : null, res : [null] },
    { path : '.data', data : [{ data : 1 }, { data : null }, { data : 3 }], res : [1, null, 3] },
    { path : '.info{.description}', res : [{ description : 'books about javascript', content : 'content' }]},
    { path : '.info{.noexists}', res : []},
    { path : '.books{.favorite}.idx', res : [1, 2]},
    { path : '.books{.author.name}.idx', res : [0, 1, 2, 3, 4]},
    { path : '.books{.description.notes}.idx', res : [3]},
    { path : '.books{.author.noexists}.idx', res : []}
];
