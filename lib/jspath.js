var parser = require('./parser');

exports.apply = function(path, ctx) {
    var parserRes;
    try {
        parserRes = parser.parse(path);
    }
    catch(e) {
        console.log('jspath parse error: ' + e.message);
        return;
    }

    return parserRes(ctx);
};