var parser = require('./parser'),
    cache = {};

exports.apply = function(path, ctx) {
    var params = typeof ctx === 'undefined'? path : { path : path, ctx : ctx },
        parserRes;

    if(cache[params.path]) {
        parserRes = cache[params.path];
    }
    else {
        try {
            parserRes = cache[params.path] = parser.parse(params.path);
        }
        catch(e) {
            console.log('jspath parse error: ' + e.message);
            return;
        }
    }

    return parserRes(params.ctx, params.substs);
};