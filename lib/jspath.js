/**
* JSPath
*
* Copyright (c) 2012 Filatov Dmitry (dfilatov@yandex-team.ru)
* Dual licensed under the MIT and GPL licenses:
* http://www.opensource.org/licenses/mit-license.php
* http://www.gnu.org/licenses/gpl.html
*
* @version 0.0.2
*/

(function(def) {

var undef;

if(typeof exports === 'object') {
    def(undef, exports);
}
else if(typeof define === 'function') {
    define(def);
}
else {
    def(undef, JSPath = {});
}

})(function(_, exports) {

var TOKEN = {
        ID         : 1,
        NUMERIC    : 2,
        STRING     : 3,
        BOOLEAN    : 4,
        PUNCTUATOR : 5,
        EOP        : 6
    },
    SYNTAX = {
        PATH               : 1,
        SELECTOR           : 2,
        OBJECT_PREDICATE   : 3,
        ARRAY_PREDICATE    : 4,
        LOGICAL_EXPRESSION : 5,
        BINARY_EXPRESSION  : 6,
        UNARY_EXPRESSION   : 7,
        ARRAY_EXPRESSION   : 8,
        LITERAL            : 9,
        SUBST              : 10
    },
    MESSAGES = {
        UNEXPECTED_TOKEN : 'Unexpected token "%0"',
        UNEXPECTED_EOP   : 'Unexpected end of path'
    };

var path, idx, buf, len;

function parse(_path) {
    path = _path;
    idx = 0;
    buf = null;
    len = path.length;

    var res = parsePath(),
        token = lex();

    if(token.type !== TOKEN.EOP) {
        throwUnexpected(token);
    }

    return res;
}

function parsePath() {
    var fromRoot = false;
    if(match('^')) {
        lex();
        fromRoot = true;
    }

    if(!matchSelector()) {
        throwUnexpected(lex());
    }

    var parts = [],
        part;
    while(idx < len) {
        part = parsePathPart();
        if(!part) {
            break;
        }
        parts.push(part);
    }

    return {
        type     : SYNTAX.PATH,
        fromRoot : fromRoot,
        parts    : parts
    };
}

function parsePathPart() {
    if(matchSelector()) {
        var selector = lex().val,
            token = lookahead(),
            prop;

        if(match('*') || selector === '..' || token.type === TOKEN.ID || token.type === TOKEN.STRING) {
            prop = parseProp();
        }

        return {
            type     : SYNTAX.SELECTOR,
            selector : selector,
            prop     : prop
        };
    }

    if(match('[')) {
        return parseArrayPredicate();
    }

    if(match('{')) {
        return parseObjectPredicate();
    }
}

function parseProp() {
    var token = lex(),
        type = token.type;

    if(type === TOKEN.ID || type === TOKEN.STRING || (type === TOKEN.PUNCTUATOR && token.val === '*')) {
        return token.val;
    }

    throwUnexpected(token);
}

function parseArrayPredicate() {
    expect('[');
    var expr = parseArrExpr();
    expect(']');

    return {
        type : SYNTAX.ARRAY_PREDICATE,
        arg  : expr
    };
}

function parseObjectPredicate() {
    expect('{');
    var expr = parseLogicalORExpr();
    expect('}');

    return {
        type : SYNTAX.OBJECT_PREDICATE,
        arg  : expr
    };
}

function parseLogicalORExpr() {
    var expr = parseLogicalANDExpr(),
        operands;

    while(match('||')) {
        lex();
        (operands || (operands = [expr])).push(parseLogicalANDExpr());
    }

    return operands?
        {
            type : SYNTAX.LOGICAL_EXPRESSION,
            op   : '||',
            args : operands
        } :
        expr;
}

function parseLogicalANDExpr() {
    var expr = parseEqualityExpr(),
        operands;

    while(match('&&')) {
        lex();
        (operands || (operands = [expr])).push(parseEqualityExpr());
    }

    return operands?
        {
            type : SYNTAX.LOGICAL_EXPRESSION,
            op   : '&&',
            args : operands
        } :
        expr;
}

function parseEqualityExpr() {
    var expr = parseRelationalExpr();

    while(match('==') || match('!=') || match('===') || match('!==') ||
            match('^=') || match('^==') || match('$==') || match('$=') || match('*==') || match('*=')) {
        expr = {
            type : SYNTAX.BINARY_EXPRESSION,
            op   : lex().val,
            args : [expr, parseEqualityExpr()]
        };
    }

    return expr;
}

function parseRelationalExpr() {
    var expr = parseAdditiveExpr();

    while(match('<') || match('>') || match('<=') || match('>=')) {
        expr = {
            type : SYNTAX.BINARY_EXPRESSION,
            op   : lex().val,
            args : [expr, parseRelationalExpr()]
        };
    }

    return expr;
}

function parseAdditiveExpr() {
    var expr = parseMultiplicativeExpr();

    while(match('+') || match('-')) {
        expr = {
            type : SYNTAX.BINARY_EXPRESSION,
            op   : lex().val,
            args : [expr, parseAdditiveExpr()]
        };
    }

    return expr;
}

function parseMultiplicativeExpr() {
    var expr = parseUnaryExpr();

    while(match('*') || match('/') || match('%')) {
        expr = {
            type : SYNTAX.BINARY_EXPRESSION,
            op   : lex().val,
            args : [expr, parseMultiplicativeExpr()]
        };
    }

    return expr;
}

function parseArrExpr() {
    if(match(':')) {
        lex();
        return {
            type  : SYNTAX.ARRAY_EXPRESSION,
            toIdx : parseUnaryExpr()
        };
    }

    var fromExpr = parseUnaryExpr();
    if(match(':')) {
        lex();
        if(match(']')) {
            return {
                type    : SYNTAX.ARRAY_EXPRESSION,
                fromIdx : fromExpr
            };

        }

        return {
            type    : SYNTAX.ARRAY_EXPRESSION,
            fromIdx : fromExpr,
            toIdx   : parseUnaryExpr()
        };
    }

    return {
        type : SYNTAX.ARRAY_EXPRESSION,
        idx  : fromExpr
    };
}

function parseUnaryExpr() {
    if(match('!') || match('-')) {
        return {
            type : SYNTAX.UNARY_EXPRESSION,
            op   : lex().val,
            arg  : parseUnaryExpr()
        };
    }

    return parsePrimaryExpr();
}

function parsePrimaryExpr() {
    var token = lookahead(),
        type = token.type;

    if(type === TOKEN.STRING || type === TOKEN.NUMERIC || type === TOKEN.BOOLEAN) {
        return {
            type : SYNTAX.LITERAL,
            val  : lex().val
        };
    }

    if(type === TOKEN.ID && token.val[0] === '$') {
        return {
            type : SYNTAX.SUBST,
            name : lex().val.substr(1)
        };
    }

    if(match('^') || matchSelector()) {
        return parsePath();
    }

    if(match('(')) {
        return parseGroupExpr();
    }

    return throwUnexpected(lex());
}

function parseGroupExpr() {
    expect('(');
    var expr = parseLogicalORExpr();
    expect(')');
    return expr;
}

function match(val) {
    var token = lookahead();
    return token.type === TOKEN.PUNCTUATOR && token.val === val;
}

function matchSelector() {
    var token = lookahead();
    if(token.type === TOKEN.PUNCTUATOR) {
        var val = token.val;
        return val === '.' || val === '..';
    }

    return false;
}

function expect(val) {
    var token = lex();
    if(token.type !== TOKEN.PUNCTUATOR || token.val !== val) {
        throwUnexpected(token);
    }
}

function lookahead() {
    var pos;

    if(buf !== null) {
        return buf;
    }

    pos = idx;
    buf = advance();
    idx = pos;

    return buf;
}

function advance() {
    while(isWhiteSpace(path[idx])) {
        ++idx;
    }

    if(idx >= len) {
        return {
            type  : TOKEN.EOP,
            range : [idx, idx]
        };
    }

    var token = scanPunctuator();
    if(token) {
        return token;
    }

    token = scanString();
    if(token) {
        return token;
    }

    token = scanNumeric();
    if(token) {
        return token;
    }

    token = scanId();
    if(token) {
        return token;
    }

    throwUnexpected({ val : path[idx], range : [idx, idx] });
}

function lex() {
    var token;

    if(buf) {
        idx = buf.range[1];
        token = buf;
        buf = null;
        return token;
    }

    buf = null;
    return advance();
}

function nextChar() {
    return path[idx++];
}

function isDecimalDigit(ch) {
    return '0123456789'.indexOf(ch) >= 0;
}

function isWhiteSpace(ch) {
    return ch === ' ';
}

function isIdStart(ch) {
    return (ch === '$') || (ch === '_') || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

function isIdPart(ch) {
    return (ch === '$') || (ch === '_') || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
        ((ch >= '0') && (ch <= '9'));
}

function scanId() {
    var ch = path[idx];

    if(!isIdStart(ch)) {
        return;
    }

    var start = idx,
        id = nextChar();

    while(idx < len) {
        ch = path[idx];
        if(!isIdPart(ch)) {
            break;
        }
        id += nextChar();
    }

    if(id === 'true' || id === 'false') {
        return {
            type  : TOKEN.BOOLEAN,
            val   : id === 'true',
            range : [start, idx]
        };
    }

    return {
        type  : TOKEN.ID,
        val   : id,
        range : [start, idx]
    };
}

function scanString() {
    if(path[idx] !== '"') {
        return;
    }

    var start = ++idx,
        str = '',
        ch;

    while(idx < len) {
        ch = nextChar();
        if(ch === '"') {
            break;
        }
        str += ch;
    }

    return {
        type  : TOKEN.STRING,
        val   : str,
        range : [start, idx]
    };
}

function scanNumeric() {
    var start = idx,
        ch = path[idx],
        isFloat = ch === '.';

    if(isFloat || isDecimalDigit(ch)) {
        var num = ch;
        while(++idx < len) {
            ch = path[idx];
            if(ch === '.') {
                if(isFloat) {
                    return;
                }
                isFloat = true;
            }
            else if(!isDecimalDigit(ch)) {
                break;
            }

            num += ch;
        }
        return {
            type  : TOKEN.NUMERIC,
            val   : isFloat? parseFloat(num) : parseInt(num, 10),
            range : [start, idx]
        }
    }
}

function scanPunctuator() {
    var start = idx,
        ch1 = path[idx],
        ch2 = path[idx + 1];

    if(ch1 === '.') {
        if(isDecimalDigit(ch2)) {
            return;
        }

        return path[++idx] === '.'?
            {
                type  : TOKEN.PUNCTUATOR,
                val   : '..',
                range : [start, ++idx]
            } :
            {
                type  : TOKEN.PUNCTUATOR,
                val   : '.',
                range : [start, idx]
            };
    }

    if(ch2 === '=') {
        var ch3 = path[idx + 2];
        if(ch3 === '=') {
            if('=!^$*'.indexOf(ch1) >= 0) {
                return {
                    type  : TOKEN.PUNCTUATOR,
                    val   : ch1 + ch2 + ch3,
                    range : [start, idx += 3]
                };
            }
        }
        else if('=!^$*><'.indexOf(ch1) >= 0) {
            return {
                type  : TOKEN.PUNCTUATOR,
                val   : ch1 + ch2,
                range : [start, idx += 2]
            };
        }
    }

    if(ch1 === ch2 && (ch1 === '|' || ch1 === '&')) {
        return {
            type  : TOKEN.PUNCTUATOR,
            val   : ch1 + ch2,
            range : [start, idx += 2]
        };
    }

    if(':{}()[]^+-*/%!><'.indexOf(ch1) >= 0) {
        return {
            type  : TOKEN.PUNCTUATOR,
            val   : ch1,
            range : [start, ++idx]
        };
    }
}

function throwUnexpected(token) {
    if(token.type === TOKEN.EOP) {
        throwError(token, MESSAGES.UNEXPECTED_EOP);
    }

    throwError(token, MESSAGES.UNEXPECTED_TOKEN, token.val);
}

function throwError(token, messageFormat) {
    var args = Array.prototype.slice.call(arguments, 2),
        msg = messageFormat.replace(
            /%(\d)/g,
            function(_, idx) {
                return args[idx] || '';
            }),
        error = new Error(msg);

    error.column = token.range[0];

    throw error;
}

// helpers

function applyPath(ctx, root, substs, fns) {
    var fn, i = 0,
        res = Array.isArray(ctx)? ctx : [ctx];

    while(fn = fns[i++]) {
        res = fn(res, root, substs);
        if(!res || !res.length) {
            return [];
        }
    }

    return res;
}

function getSelf(ctx) {
    return ctx;
}

function getProp(ctx, prop) {
    var res = [], i = 0, len = ctx.length,
        curCtx, keys, keysLen, j,
        allProps = prop === '*';

    while(i < len) {
        curCtx = ctx[i++];
        if(curCtx != null) {
            if(allProps) {
                keys = Object.keys(curCtx);
                j = 0; keysLen = keys.length;
                while(j < keysLen) {
                    res = appendToArr(res, curCtx[keys[j++]]);
                }
            }
            else {
                res = appendToArr(res, curCtx[prop]);
            }
        }
    }

    return res;
}

function getDescendantProps(ctx, prop, undef) {
    ctx = ctx.slice();

    var res = [], curCtx, childCtxs,
        i, len, keys;

    while(ctx.length) {
        if(typeof (curCtx = ctx.shift()) !== 'object' || curCtx === null) {
            continue;
        }

        childCtxs = [];
        if(Array.isArray(curCtx)) {
            i = 0; len = curCtx.length;
            while(i < len) {
                childCtxs = appendToArr(childCtxs, curCtx[i++]);
            }
        }
        else {
            res = appendToArr(res, getProp([curCtx], prop));

            keys = Object.keys(curCtx); i = 0; len = keys.length;
            while(i < len) {
                childCtxs = appendToArr(childCtxs, curCtx[keys[i++]]);
            }
        }

        childCtxs.length && ctx.unshift.apply(ctx, childCtxs);
    }

    return res;
}

function appendToArr(arr, val) {
    if(typeof val !== 'undefined') {
        Array.isArray(val)?
            arr = arr.concat(val) :
            arr.push(val);
    }

    return arr;
}

function toBoolean(obj) {
    return !!(Array.isArray(obj)? obj.length : obj);
}

var BINARY_OPERATIONS = {
    '===' : function(val1, val2) {
        return val1 === val2;
    },
    '==' : function(val1, val2) {
        return typeof val1 === 'string' && typeof val2 === 'string'?
            val1.toLowerCase() === val2.toLowerCase() :
            val1 == val2;
    },
    '>=' : function(val1, val2) {
        return val1 >= val2;
    },
    '>' : function(val1, val2) {
        return val1 > val2;
    },
    '<=' : function(val1, val2) {
        return val1 <= val2;
    },
    '<' : function(val1, val2) {
        return val1 < val2;
    },
    '!==' : function(val1, val2) {
        return val1 !== val2;
    },
    '!=' : function(val1, val2) {
        return val1 != val2;
    },
    '^==' : function(val1, val2) {
        return typeof val1 === 'string' &&
            typeof val2 === 'string' &&
            val1.indexOf(val2) === 0;
    },
    '^=' : function(val1, val2) {
        return val1 !== null && val2 !== null &&
            val1.toString().toLowerCase().indexOf(val2.toString().toLowerCase()) === 0;
    },
    '$==' : function(val1, val2) {
        return typeof val1 === 'string' &&
            typeof val2 === 'string' &&
            val1.indexOf(val2, val1.length - val2.length) > -1;
    },
    '$=' : function(val1, val2) {
        if(val1 === null || val2 === null) {
            return false;
        }

        var val1Str = val1.toString().toLowerCase(),
            val2Str = val2.toString().toLowerCase();

        return val1Str.indexOf(val2Str, val1Str.length - val2Str.length) > -1;
    },
    '*==' : function(val1, val2) {
        return typeof val1 === 'string' &&
            typeof val2 === 'string' &&
            val1.indexOf(val2) > -1;
    },
    '*=' : function(val1, val2) {
        return val1 !== null && val2 !== null &&
            val1.toString().toLowerCase().indexOf(val2.toString().toLowerCase()) > -1;
    },
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

function buildBinaryExpr(operands, fn) {
    return function(ctx, root, substs) {
        var ops = operands,
            i = 1, len = ops.length - 1,
            res = ops[0](ctx, root, substs);

        while(i < len) {
            res = fn(res, ops[i + 1](ctx, root, substs), ops[i]);
            i += 2;
        }

        return res;
    };
}

function applyEqualityOp(val1, val2, fn) {
    var isVal1Array = Array.isArray(val1),
        isVal2Array = Array.isArray(val2);

    // optimize one-item arrays
    if(isVal1Array && val1.length === 1) {
        val1 = val1[0];
        isVal1Array = false;
    }

    if(isVal2Array && val2.length === 1) {
        val2 = val2[0];
        isVal2Array = false;
    }

    return isVal1Array?
        isVal2Array?
            val1.some(function(val1) {
                return val2.some(function(val2) {
                    return fn(val1, val2);
                });
            }) :
            val1.some(function(val1) {
                return fn(val1, val2);
            }) :
        isVal2Array?
            val2.some(function(val2) {
                return fn(val1, val2);
            }) :
            fn(val1, val2);
}

function applyArithmeticOp(val1, val2, fn) {
    return fn(Array.isArray(val1)? val1[0] : val1, Array.isArray(val2)? val2[0] : val2);
}

exports._parse = parse;

var cache = {};

exports.apply = function(path, ctx, substs) {
    return (cache[path] || (cache[path] = parse(path)))(ctx, ctx, substs || {});
};

});