{
    var isArray = Array.isArray;

    function makeArray(ctx) {
        return isArray(ctx)? ctx.slice() : [ctx];
    }

    function applyPathFns(ctx, fns) {
        var fn, i = 0, j, ctxLen, res = makeArray(ctx), fnRes;

        while(fn = fns[i++]) {
            j = 0;
            ctxLen = res.length;
            while(j < ctxLen) {
                fnRes = fn(res[j++]);
                if(Array.isArray(fnRes)) {
                    res = res.concat(fnRes);
                }
                else if(typeof fnRes !== 'undefined') {
                    res.push(fnRes);
                }
            }
            res.splice(0, ctxLen);
            if(!res.length) {
                break;
            }
        }

        return res;
    }

    function applyPredFns(ctx, fns) {
        var fn, i = 0, res = ctx;

        while((fn = fns[i++]) && typeof res !== 'undefined') {
            res = fn(res);
        }

        return res;
    }

    var binaryOps = {
        '===' : function(val1, val2) {
            return val1 === val2;
        },
        '==' : function(val1, val2) {
            return val1 == val2;
        },
        '>=' : function(val1, val2) {
            return val1 >= val2;
        },
        '>'  : function(val1, val2) {
            return val1 > val2;
        },
        '<=' : function(val1, val2) {
            return val1 <= val2;
        },
        '<'  : function(val1, val2) {
            return val1 < val2;
        },
        '!==' : function(val1, val2) {
            return val1 !== val2;
        },
        '!=' : function(val1, val2) {
            return val1 != val2;
        },
        '^=' : function(val1, val2) {
            return val1.toString().indexOf(val2) === 0;
        },
        '$=' : function(val1, val2) {
            var val1Str = val1.toString(),
                val2Str = val2.toString();

            return val1Str.indexOf(val2Str, val1Str.length - val2Str.length) > -1;
        },
        '*=' : function(val1, val2) {
            return val1.toString().indexOf(val2.toString()) > -1;
        }
    }

    function applyBinaryOp(val1, val2, op) {
        var opFn = binaryOps[op];
        return isArray(val1)?
            isArray(val2)?
                val1.some(function(val1) {
                    return val2.some(function(val2) {
                        return opFn(val1, val2);
                    });
                }) :
                val1.some(function(val1) {
                    return opFn(val1, val2);
                }) :
            isArray(val2)?
                val2.some(function(val2) {
                    return opFn(val1, val2);
                }) :
                opFn(val1, val2);
    }

    function findDescendants(ctx, prop) {
        var res = [], ctxs = [ctx], curCtx, childCtxs;

        while(ctxs.length) {
            (curCtx = ctxs.shift()).hasOwnProperty(prop) && res.push(curCtx[prop]);
            childCtxs = [];
            Object.keys(curCtx).forEach(function(key) {
                typeof curCtx[key] === 'object' && childCtxs.push(curCtx[key]);
            });
            childCtxs.length && (ctxs = childCtxs.concat(ctxs));
        }

        return res;
    }
}

start
    = path

path
    = '@' parts:(part)+ {
        return function(ctx) {
            return applyPathFns(
                ctx,
                parts.map(function(part) {
                    return part;
                }));
        }
    }
    / '@' {
        return function(ctx) {
            return makeArray(ctx);
        };
    }

part
    = selector:selector pred:pred* {
        return function(ctx) {
            return pred.length? applyPredFns(selector(ctx), pred) : selector(ctx);
        };
    }

selector
    = [.] [.] prop:prop {
        return function(ctx) {
            return findDescendants(ctx, prop);
        }
    }
    / [.] prop:prop {
        return function(ctx) {
            return ctx[prop];
        }
    }


prop
    = prop:[-_a-z0-9/]i+ {
        return prop.join('');
    }
    / '"' prop:[-_a-z0-9/.]i+ '"' {
        return prop.join('');
    }

pred
    = objPred
    / arrPred

objPred
    = '{' _ objPredRule:objPredRule _ '}' {
        return function(ctx) {
            return isArray(ctx)?
                ctx.filter(function(item) {
                    return objPredRule(item);
                }) :
                objPredRule(ctx)? ctx : undefined;
        }
    }

objPredRule
    = objPredRuleBinary
    / objPredHasProperty

objPredRuleBinary
    = left:exp _ binaryOp:binaryOp _ right:exp {
        return function(ctx) {
            return applyBinaryOp(left(ctx), right(ctx), binaryOp);
        }
    }

objPredHasProperty
    = path:path {
        return function(ctx) {
            return !!path(ctx).length;
        }
    }

binaryOp
    = '==='
    / '=='
    / '>='
    / '>'
    / '<='
    / '<'
    / '!=='
    / '!='
    / '^='
    / '$='
    / '*='

exp
    = path
    / value:value {
        return function() {
            return value;
        }
    }

arrPred
    = '[' _ arrPredRule:arrPredRule _ ']' {
        return function(ctx) {
            return Array.isArray(ctx)?
                arrPredRule(ctx) :
                undefined;
        }
    }

arrPredRule
    = arrPredRuleBetween
    / arrPredRuleLess
    / arrPredRuleMore
    / arrPrevRuleIdx

arrPredRuleBetween
    = idxFrom:int '..' idxTo:int {
        return function(ctx) {
            return ctx.slice(idxFrom, idxTo);
        }
    }

arrPredRuleLess
    = '..' idx:int {
        return function(ctx) {
            return ctx.slice(0, idx);
        }
    }

arrPredRuleMore
    = idx:int '..' {
        return function(ctx) {
            return ctx.slice(idx);
        }
    }

arrPrevRuleIdx
    = idx:int {
        return function(ctx) {
            return idx >= 0? ctx[idx] : ctx[ctx.length + idx];
        }
    }

value
    = boolean
    / string
    / float
    / int

boolean
    = 'true' {
        return true;
    }
    / 'false' {
        return false;
    }

string
    = '"' '"' _ { return ""; }
    / '"' chars:chars '"' _ { return chars; }

chars
    = chars:char+ { return chars.join(''); }

char
    = [^"\\\0-\x1F\x7f]
    / '\\"' { return '"'; }
    / "\\\\" { return "\\"; }
    / "\\/" { return "/"; }
    / "\\b" { return "\b"; }
    / "\\f" { return "\f"; }
    / "\\n" { return "\n"; }
    / "\\r" { return "\r"; }
    / "\\t" { return "\t"; }
    / "\\u" h1:hexDigit h2:hexDigit h3:hexDigit h4:hexDigit {
        return String.fromCharCode(parseInt('0x' + h1 + h2 + h3 + h4));
    }

hexDigit
    = [0-9a-fA-F]

float
    = sign:'-'? int:[0-9]* [.] frac:[0-9]+ { return parseFloat(sign + int.join('') + '.' + frac.join('')); }

int
    = sign:'-'? int:[0-9]+ { return parseInt(sign + int.join(''), 10); }

_
    = [ \t]*