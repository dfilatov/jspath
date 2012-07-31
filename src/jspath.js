var parser = require('pegjs')
        .buildParser(require('fs').readFileSync(__dirname + '/jspath.pegjs', 'utf8'));

exports.apply = function(path, ctx) {
    var parserRes;
    try {
        parserRes = parser.parse(path);
    }
    catch(e) {
        console.log('jpath parse error: ' + e.message);
        return;
    }

    return parserRes(ctx);
};