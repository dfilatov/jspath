module.exports = [
    { path : '.books{.idx === $idx}.idx', substs : { idx : 1 }, res : [1]},
    { path : '.books{.idx === $idx}.idx', substs : { idx : "1" }, res : [] },
    { path : '.books{.idx == $idx}.idx', substs : { idx : "1" }, res : [1]},
    { path : '.books{.idx === $idx}.idx', substs : { idx : [1, 2] }, res : [1, 2]},
    { path : '.books{.oldPrices === $prices}.idx', substs : { prices : [10, 15] }, res : [0, 1, 3]},
    { path : '.books[$idx].idx', substs : { idx : 1 }, res : [1] },
    { path : '.books[$idx[0]].idx', substs : { idx : 1 }, res : [1] },
    { path : '.books[$idx.nested].idx', substs : { idx : { nested : 1 } }, res : [1] },
    { path : '.books[$idxFrom:$idxTo].idx', substs : { idxFrom : 1, idxTo : 3 }, res : [1, 2]},
    { path : '$idx', substs : { idx : 1 }, res : [1]},
    { path : '$idx..b', substs : { idx : { a : { b : 3 } } }, res : [3]}
];