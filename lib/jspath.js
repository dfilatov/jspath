var parser = require('./parser');

exports.apply = function(path, ctx) {
    var params = typeof ctx === 'undefined'? path : { path : path, ctx : ctx };

    var parserRes;
    try {
        parserRes = parser.parse(params.path);
    }
    catch(e) {
        console.log('jspath parse error: ' + e.message);
        return;
    }

    return parserRes(params.ctx, params.substs);
};