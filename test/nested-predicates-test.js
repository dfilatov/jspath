module.exports = [
    { path : '.books..{.price<20 && (.author.name*=="Zakas" || .author.name*=="Martin")}.name',
      res : ["Clean Code", "Maintainable JavaScript"]},
    { path : '.books..{.price<20 && .author{.name*=="Zakas" || .name*=="Martin"}}.name',
      res : ["Clean Code", "Maintainable JavaScript"]},
];
