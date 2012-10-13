module.exports = [
    { path : '.books{.keywords === "javascript" || .keywords === "c#"}.idx', res : [1, 2, 3, 4]},
    { path : '.books{.keywords === "javascript" || .keywords === "c#" || .keywords === "code"}.idx', res : [0, 1, 2, 3, 4]},
    { path : '.books{.keywords === "javascript" && .keywords === "code"}.idx', res : [1, 3, 4]},
    { path : '.books{.keywords === "javascript" && .keywords === "code" && .keywords === "patterns"}.idx', res : [1]},
    { path : '.books{!.description}.idx', res : [0, 1, 2, 4]},
    { path : '.books{!.description && .keywords == "refactoring"}.idx', res : [0]},
    { path : '.books{!.description || !(.price > 15)}.idx', res : [0, 1, 2, 4]},
    { path : '.books{.description || .price > 15 && .keywords == "javascript"}.idx', res : [3, 4]},
    { path : '.books{(.keywords === "javascript" && .keywords === "patterns") || .keywords === "agile"}.idx', res : [1, 2]},
    { path : '.books{(.keywords === "javascript" || .keywords === "code") && .favorite === true}.idx', res : [1]},
    { path : '.books{!(.keywords === "javascript")}.idx', res : [0, 2]}
];
