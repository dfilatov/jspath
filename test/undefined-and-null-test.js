module.exports = [
    { path : '@.item.idx', data : [{ item : { idx : 0 }}, null], res : [0]},
    { path : '@..item..idx', data : [{ item : { idx : 0 }}, null], res : [0]},
    { path : '@.item.idx', data : [{ item : { idx : 0 }}, undefined], res : [0]},
    { path : '@..item..idx', data : [{ item : { idx : 0 }}, undefined], res : [0]}
];