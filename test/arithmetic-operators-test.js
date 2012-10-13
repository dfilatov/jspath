module.exports = [
    { path : '.books{.idx + 1 > 3}.idx', res : [3, 4]},
    { path : '.books{.idx - 2 < 0}.idx', res : [0, 1]},
    { path : '.books{.idx * 2 === 4}.idx', res : [2]},
    { path : '.books{.idx / 2 > 1.1}.idx', res : [3, 4]},
    { path : '.books{.idx % 2 === 1}.idx', res : [1, 3]},
    { path : '.books{.idx % 2 === 1 || .idx % 3 === 1}.idx', res : [1, 3, 4]},
    { path : '.books{.idx + 1 + 2 === 3}.idx', res : [0]},
    { path : '.books{.idx + 2 * 3 === 7}.idx', res : [1]},
    { path : '.books{.idx * 2 + 3 === 7}.idx', res : [2]},
    { path : '.books{.idx * (2 + 3) === 10}.idx', res : [2]},
    { path : '.books{.idx * 2 / 3 === 2}.idx', res : [3]},
    { path : '.books{.idx * 2 + 3 * .idx + 2 * 1 === 17}.idx', res : [3]},
    { path : '.books{.idx * 2 * 3 === 6}.idx', res : [1]},
    { path : '.books{.idx * 2 / 3 === 2 && .idx * (4 - 2) === (2 * .idx)}.idx', res : [3]}
];
