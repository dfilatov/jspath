module.exports = [
    { path : '', message : 'Unexpected end of path' },
    { path : 'id', message : 'Unexpected token "id"' },
    { path : '.#', message : 'Unexpected token "#"' },
    { path : '.[.] id', message : 'Unexpected token "id"' },
    { path : '{}', message : 'Unexpected token "{"' },
    { path : '[]', message : 'Unexpected token "["' },
    { path : '.{.a > }', message : 'Unexpected token "}"' },
    { path : '.{.a >', message : 'Unexpected end of path' },
    { path : '.(.a || .b)', message : 'Unexpected token "||"' },
    { path : '.[:2:]', message : 'Unexpected token ":"' },
    { path : '.[1:2:3]', message : 'Unexpected token ":"' },
    { path : '.{.2.3}', message : 'Unexpected token "."' },
    { path : '."aaa', message : 'Unexpected end of path' }
];