/**
* JSPath
*
* Copyright (c) 2012 Filatov Dmitry (dfilatov@yandex-team.ru)
* Dual licensed under the MIT and GPL licenses:
* http://www.opensource.org/licenses/mit-license.php
* http://www.gnu.org/licenses/gpl.html
*
* @version 0.0.5
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

    return fromRoot?
        function(ctx, root, substs) {
            return applyPath(root, root, substs, parts);
        } :
        function(ctx, root, substs) {
            return applyPath(ctx, root, substs, parts);
        };
}

function parsePathPart() {
    if(matchSelector()) {
        return parseSelector();
    }

    if(match('[')) {
        return parseArrayPredicate();
    }

    if(match('{')) {
        return parseObjectPredicate();
    }
}

function parseSelector() {
    var selector = lex().val,
        token = lookahead(),
        prop;

    if(match('*') || selector === '..' || token.type === TOKEN.ID || token.type === TOKEN.STRING) {
        prop = parseProp();
    }

    return selector === '..'?
        buildGetDescendantProps(prop) :
        prop?
            buildGetProps(prop) :
            getSelf;
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

    return expr;
}

function parseObjectPredicate() {
    expect('{');
    var expr = parseLogicalORExpr();
    expect('}');

    return function(ctx, root, substs) {
        var res = [], i = 0, len = ctx.length, curCtx;

        while(i < len) {
            toBoolean(expr(curCtx = ctx[i++], root, substs)) && res.push(curCtx);
        }

        return res;
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
        function(ctx, root, substs) {
            var i = 0, operand;
            while(operand = operands[i++]) {
                if(toBoolean(operand(ctx, root, substs))) {
                    return true;
                }
            }
            return false;
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
        function(ctx, root, substs) {
            var i = 0, operand;
            while(operand = operands[i++]) {
                if(!toBoolean(operand(ctx, root, substs))) {
                    return false;
                }
            }
            return true;
        } :
        expr;
}

function parseEqualityExpr() {
    var expr = parseRelationalExpr(),
        operands;

    while(match('==') || match('!=') || match('===') || match('!==') ||
            match('^=') || match('^==') || match('$==') || match('$=') || match('*==') || match('*=')) {
        (operands || (operands = [expr])).push(BINARY_OPERATIONS[lex().val], parseRelationalExpr());
    }

    return operands? buildBinaryExpr(operands, applyEqualityOp) : expr;
}

function parseRelationalExpr() {
    var expr = parseAdditiveExpr(),
        operands;

    while(match('<') || match('>') || match('<=') || match('>=')) {
        (operands || (operands = [expr])).push(BINARY_OPERATIONS[lex().val], parseAdditiveExpr());
    }

    return operands? buildBinaryExpr(operands, applyEqualityOp) : expr;
}

function parseAdditiveExpr() {
    var expr = parseMultiplicativeExpr(),
        operands;

    while(match('+') || match('-')) {
        (operands || (operands = [expr])).push(BINARY_OPERATIONS[lex().val], parseMultiplicativeExpr());
    }

    return operands? buildBinaryExpr(operands, applyArithmeticOp) : expr;
}

function parseMultiplicativeExpr() {
    var expr = parseUnaryExpr(),
        operands;

    while(match('*') || match('/') || match('%')) {
        (operands || (operands = [expr])).push(BINARY_OPERATIONS[lex().val], parseUnaryExpr());
    }

    return operands? buildBinaryExpr(operands, applyArithmeticOp) : expr;
}

function parseArrExpr() {
    if(match(':')) {
        lex();
        var toExpr = parseUnaryExpr();
        return function(ctx, root, substs) {
            return ctx.slice(0, toExpr(ctx, root, substs));
        };
    }

    var fromExpr = parseUnaryExpr();
    if(match(':')) {
        lex();
        if(match(']')) {
            return function(ctx, root, substs) {
                return ctx.slice(fromExpr(ctx, root, substs));
            };
        }

        var toExpr = parseUnaryExpr();
        return function(ctx, root, substs) {
            return ctx.slice(fromExpr(ctx, root, substs), toExpr(ctx, root, substs));
        };
    }

    return function(ctx, root, substs) {
        var idx = fromExpr(ctx, root, substs),
            res = idx >= 0? ctx[idx] : ctx[ctx.length + idx];

        return typeof res === 'undefined'? res : [res];
    };
}

function parseUnaryExpr() {
    if(match('!')) {
        lex();
        var expr = parseUnaryExpr();
        return function(ctx, root, substs) {
            return !toBoolean(expr(ctx, root, substs));
        }
    }

    if(match('-')) {
        lex();
        var expr = parseUnaryExpr();
        return function(ctx, root, substs) {
            return -expr(ctx, root, substs);
        }
    }

    return parsePrimaryExpr();
}

function parsePrimaryExpr() {
    var token = lookahead(),
        type = token.type;

    if(type === TOKEN.STRING || type === TOKEN.NUMERIC || type === TOKEN.BOOLEAN) {
        var val = lex().val;
        return function() {
            return val;
        };
    }

    if(type === TOKEN.ID && token.val[0] === '$') {
        var name = lex().val.substr(1);
        return function(ctx, root, substs) {
            return substs[name];
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

function buildGetProps(prop) {
    var body =
            'var res = [], i = 0, len = ctx.length,' +
                'curCtx, keys, keysLen, j, val;' +
            'while(i < len) {' +
                'curCtx = ctx[i++];' +
                inlineGetProp(prop, 'res') +
            '}' +
            'return res;';

    return Function('ctx', body);
}

function inlineGetProp(prop, resVarName) {
    return 'if(curCtx != null) {' +
        (prop === '*'?
            'keys = Object.keys(curCtx);' +
            'j = 0; keysLen = keys.length;' +
            'while(j < keysLen) {' +
                'val = curCtx[keys[j++]];' +
                inlineAppendToArray(resVarName, 'val') +
            '}' :
            'val = curCtx["' + prop + '"];' +
            'if(typeof val !== "undefined") {' +
                inlineAppendToArray(resVarName, 'val') +
            '}') +
    '}';
}

function inlineAppendToArray(resVarName, valVarName) {
    return 'Array.isArray(' + valVarName + ')? ' +
        resVarName + ' = ' + resVarName + '.concat(' + valVarName + ') : ' +
        resVarName + '.push(' + valVarName + ');';
}

function buildGetDescendantProps(prop) {
    var body =
            'ctx = ctx.slice();' +
            'var res = [], curCtx, childCtxs,' +
                'i, j, len, keys, keysLen, val, vals;' +
            'while(ctx.length) {' +
                'if(typeof (curCtx = ctx.shift()) !== "object" || curCtx === null) {' +
                    'continue;' +
                '}' +
                'childCtxs = [];' +
                'if(Array.isArray(curCtx)) {' +
                    'i = 0; len = curCtx.length;' +
                    'while(i < len) {' +
                        'val = curCtx[i++];' +
                        inlineAppendToArray('childCtxs', 'val') +
                    '}' +
                '}' +
                'else {' +
                    'vals = [];' +
                    inlineGetProp(prop, 'vals') +
                    inlineAppendToArray('res', 'vals') +
                    'keys = Object.keys(curCtx); i = 0; len = keys.length;' +
                    'while(i < len) {' +
                        'val = curCtx[keys[i++]];' +
                        inlineAppendToArray('childCtxs', 'val') +
                    '}' +
                '}' +
                'childCtxs.length && ctx.unshift.apply(ctx, childCtxs);' +
            '}' +
            'return res;';

    return Function('ctx', body);
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

var MAX_CACHE_SIZE = 100,
    cache = {},
    cacheKeys = [];

exports.apply = function(path, ctx, substs) {
    if(!cache[path]) {
        cache[path] = parse(path);
        if(cacheKeys.push(path) > MAX_CACHE_SIZE) {
            delete cache[cacheKeys.shift()];
        }
    }

    return cache[path](ctx, ctx, substs || {});
};

});