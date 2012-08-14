{
    var undef,
        isArray = Array.isArray;

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
                if(isArray(fnRes)) {
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

    var comparisonOperators = {
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
    };

    function applyComparisonOperator(val1, val2, operator) {
        var operatorFn = comparisonOperators[operator];
        return isArray(val1)?
            isArray(val2)?
                val1.some(function(val1) {
                    return val2.some(function(val2) {
                        return operatorFn(val1, val2);
                    });
                }) :
                val1.some(function(val1) {
                    return operatorFn(val1, val2);
                }) :
            isArray(val2)?
                val2.some(function(val2) {
                    return operatorFn(val1, val2);
                }) :
                operatorFn(val1, val2);
    }

    var arithmeticOperators = {
        '+' : function(val1, val2) {
            return val1 + val2;
        },
        '-' : function(val1, val2) {
            return val1 - val2;
        },
        '*' : function(val1, val2) {
            return val1 * val2;
        },
        '/' : function(val1, val2) {
            return val1 / val2;
        },
        '%' : function(val1, val2) {
            return val1 % val2;
        }
    };

    function applyArithmeticOperator(val1, val2, operator) {
        return arithmeticOperators[operator](
            isArray(val1)? val1[0] : val1,
            isArray(val2)? val2[0] : val2);
    }

    function findChild(ctx, prop) {
        return typeof(ctx) === 'object' && ctx !== null?
            ctx[prop] :
            undef;
    }

    function findDescendants(ctx, prop) {
        var res = [], ctxs = [ctx], curCtx, childCtxs;
        while(ctxs.length) {
            curCtx = ctxs.shift();
            if(typeof(curCtx) !== 'object' || curCtx === null) {
                continue;
            }

            curCtx.hasOwnProperty(prop) && res.push(curCtx[prop]);
            childCtxs = undef;
            isArray(curCtx)?
                curCtx.forEach(function(ctx) {
                    childCtxs = appendObjectToArray(childCtxs, ctx);
                }) :
                Object.keys(curCtx).forEach(function(key) {
                    childCtxs = appendObjectToArray(childCtxs, curCtx[key]);
                });
            childCtxs && (ctxs = childCtxs.concat(ctxs));
        }

        return res;
    }

    function appendObjectToArray(arr, val) {
        if(typeof val !== 'object') {
            return arr;
        }

        if(isArray(val)) {
            return arr? arr.concat(val) : val.slice();
        }

        (arr || (arr = [])).push(val);
        return arr;
    }
}

start
    = path

path
    = '@' parts:(part)+ {
        return function(ctx) {
            return applyPathFns(ctx, parts);
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
    = '..' prop:prop {
        return function(ctx) {
            return findDescendants(ctx, prop);
        }
    }
    / '.' prop:prop {
        return function(ctx) {
            return findChild(ctx, prop);
        }
    }

prop
    = prop:[-_a-z0-9:/]i+ {
        return prop.join('');
    }
    / '"' prop:[-_a-z0-9:/.]i+ '"' {
        return prop.join('');
    }

pred
    = '[' _ pred:(arrPred / objPred) _ ']' {
        return pred;
    }

objPred
    = expr:expr {
        return function(ctx) {
            return isArray(ctx)?
                ctx.filter(function(item) {
                    return expr(item);
                }) :
                expr(ctx)? ctx : undef;
        }
    }

expr
    = logicalExpr
    / notLogicalExpr

logicalExpr
    = logicalANDExpr
    / logicalORExpr
    / logicalNOTExpr

logicalANDExpr
    = head:(notLogicalExpr / logicalNOTExpr) _ tail:('&&' _ expr)+ {
        return function(ctx) {
            if(!head(ctx)) {
                return false;
            }

            var i = 0, len = tail.length;
            while(i < len) {
                if(!tail[i++][2](ctx)) {
                    return false;
                }
            }

            return true;
        }
    }

logicalORExpr
    = head:(notLogicalExpr / logicalNOTExpr) _ tail:('||' _ expr)+ {
        return function(ctx) {
            if(head(ctx)) {
                return true;
            }

            var i = 0, len = tail.length;
            while(i < len) {
                if(tail[i++][2](ctx)) {
                    return true;
                }
            }

            return false;
        }
    }

logicalNOTExpr
    = '!' _ expr:notLogicalExpr {
        return function(ctx) {
            return !expr(ctx);
        }
    }

notLogicalExpr
    = bracketedExpr
    / operatorExpr
    / termExpr

bracketedExpr
    = '(' _ expr:expr _ ')' {
        return expr;
    }

operatorExpr
    = comparisonExpr
    / arithmeticExpr

comparisonExpr
    = left:arithmeticExpr _ comparisonOperator:comparisonOperator _ right:arithmeticExpr {
        return function(ctx) {
            return applyComparisonOperator(left(ctx, true), right(ctx, true), comparisonOperator);
        }
    }

comparisonOperator
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

arithmeticExpr
    = additiveExpr
    / multiplicativeExpr

additiveExpr
    = left:multiplicativeExpr _ additiveOperator:additiveOperator _ right:arithmeticExpr {
        return function(ctx) {
            return applyArithmeticOperator(left(ctx, true), right(ctx, true), additiveOperator);
        }
    }

multiplicativeExpr
    = left:primaryArithmeticExpr _ multiplicativeOperator:multiplicativeOperator _ right:multiplicativeExpr {
        return function(ctx) {
            return applyArithmeticOperator(left(ctx, true), right(ctx, true), multiplicativeOperator);
        }
    }
    / primaryArithmeticExpr

primaryArithmeticExpr
    = termExpr
    / '(' _ arithmeticExpr:arithmeticExpr _ ')' {
        return arithmeticExpr;
    }

additiveOperator
    = '+'
    / '-'

multiplicativeOperator
    = '*'
    / '/'
    / '%'

termExpr
    = pathExpr
    / valueExpr

pathExpr
    = path:path {
        return function(ctx, asValue) {
            return asValue? path(ctx) : !!path(ctx).length;
        }
    }

valueExpr
    = value:value {
        return function() {
            return value;
        }
    }

arrPred
    = arrPred:(arrPredBetween / arrPredLess / arrPredMore / arrPredIdx) {
        return function(ctx) {
            return isArray(ctx)?
                arrPred(ctx) :
                undef;
        }
    }

arrPredBetween
    = idxFrom:int '..' idxTo:int {
        return function(ctx) {
            return ctx.slice(idxFrom, idxTo);
        }
    }

arrPredLess
    = '..' idx:int {
        return function(ctx) {
            return ctx.slice(0, idx);
        }
    }

arrPredMore
    = idx:int '..' {
        return function(ctx) {
            return ctx.slice(idx);
        }
    }

arrPredIdx
    = idx:int {
        return function(ctx) {
            return idx >= 0? ctx[idx] : ctx[ctx.length + idx];
        }
    }

value
    = boolean / string / float / int

boolean
    = 'true' {
        return true;
    }
    / 'false' {
        return false;
    }

string
    = '""' {
        return '';
    }
    / '"' chars:char+ '"' {
        return chars.join('');
    }

char
    = [^"\\\0-\x1F\x7f]
    / '\\"' { return '"'; }
    / '\\\\' { return '\\'; }
    / '\\/' { return '/'; }
    / '\\b' { return '\b'; }
    / '\\f' { return '\f'; }
    / '\\n' { return '\n'; }
    / '\\r' { return '\r'; }
    / '\\t' { return '\t'; }
    / '\\u' h1:hexDigit h2:hexDigit h3:hexDigit h4:hexDigit {
        return String.fromCharCode(parseInt('0x' + h1 + h2 + h3 + h4));
    }

hexDigit
    = [0-9a-fA-F]

float
    = sign:'-'? int:[0-9]* [.] frac:[0-9]+ {
        return parseFloat(sign + int.join('') + '.' + frac.join(''));
    }

int
    = sign:'-'? int:[0-9]+ {
        return parseInt(sign + int.join(''), 10);
    }
_
    = [ \t]*