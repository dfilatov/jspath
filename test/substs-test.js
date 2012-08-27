module.exports = [
    { path : '.books[.idx === {idx}].idx', substs : { idx : 1 }, res : [1]},
    { path : '.books[.idx === {idx}].idx', substs : { idx : "1" }, res : []},
    { path : '.books[.idx == {idx}].idx', substs : { idx : "1" }, res : [1]},
    { path : '.books[.idx === {idx}].idx', substs : { idx : [1, 2] }, res : [1, 2]}
];