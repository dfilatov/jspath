/**
* JSPath
*
* Copyright (c) 2012 Filatov Dmitry (dfilatov@yandex-team.ru)
* Dual licensed under the MIT and GPL licenses:
* http://www.opensource.org/licenses/mit-license.php
* http://www.gnu.org/licenses/gpl.html
*
* @version 0.0.9
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

    return {
        type : SYNTAX.SELECTOR,
        selector : selector,
        prop : prop
    };
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

    return advance();
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
    return isIdStart(ch) || (ch >= '0' && ch <= '9');
}

function scanId() {
    var ch = path[idx];

    if(!isIdStart(ch)) {
        return;
    }

    var start = idx,
        id = path[idx];

    while(++idx < len) {
        ch = path[idx];
        if(!isIdPart(ch)) {
            break;
        }
        id += ch;
    }

    return id === 'true' || id === 'false'?
        {
            type  : TOKEN.BOOLEAN,
            val   : id === 'true',
            range : [start, idx]
        } :
        {
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
        ch = path[idx++];
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
        };
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

// translator

var translate = (function() {

    function translate(ast) {
        var res = new TranslateResult();
        res.vars.push('result');

        translatePath(ast, res, 'result', 'data');
        return '  data = Array.isArray(data)? data : [data];' +
            (res.vars.length? '\n  var ' + res.vars.join(', ') + ';\n' : '') +
            (res.header.length ? '  ' + res.header.join('\n  ') + '\n' : '') +
            res.body.join('\n') +
            '\n  return result;';
    }

    function translatePath(path, res, dest, ctx) {
        var resVar = res.acquireVar();
        res.write(resVar, ' = ', (path.fromRoot ? 'data' : ctx), ';');
        for(var i = 0, l = path.parts.length; i < l; i++) {
            var item = path.parts[i];
            switch(item.type) {
                case SYNTAX.SELECTOR:
                    if(item.selector == '..') {
                        translateDescendantSelector(item, res, resVar, resVar);
                    }
                    else {
                        translateSelector(item, res, resVar, resVar);
                    }
                    break;
                case SYNTAX.OBJECT_PREDICATE:
                    res.write(translateObjectPredicate(item, res, resVar, resVar));
                    break;
                case SYNTAX.ARRAY_PREDICATE:
                    res.write(translateArrayPredicate(item, res, resVar, resVar));
                    break;
            }
        }
        res.write(dest, ' = ', resVar, ';');
        res.releaseVars(resVar);
    }

    function translateArrayPredicate(item, res, dest, ctx) {
        var arrayExpr = item.arg, fromIdx, toIdx;
        if(arrayExpr.idx) {
            var idx = res.acquireVar();
            translateExpression(arrayExpr.idx, res, idx, ctx);
            res.write(idx, ' = ', generateNormalizeArrayIndex(idx, ctx));
            res.write(dest, ' = typeof ', ctx, '[', idx, '] === \'undefined\'? [] : [', ctx, '[', idx, ']];');
            res.releaseVars(idx);
        }
        else if (arrayExpr.fromIdx) {
            if (arrayExpr.toIdx) {
                fromIdx = res.acquireVar();
                toIdx = res.acquireVar();
                translateExpression(arrayExpr.fromIdx, res, fromIdx, ctx);
                translateExpression(arrayExpr.toIdx, res, toIdx, ctx);
                res.write(fromIdx, ' = ', generateNormalizeArrayIndex(fromIdx, ctx));
                res.write(toIdx, ' = ', generateNormalizeArrayIndex(toIdx, ctx));
                res.write(dest, ' = ', ctx, '.slice(', fromIdx, ', ', toIdx, ');');
                res.releaseVars(fromIdx, toIdx);
            } else {
                fromIdx = res.acquireVar();
                translateExpression(arrayExpr.fromIdx, res, fromIdx, ctx);
                res.write(fromIdx, ' = ', generateNormalizeArrayIndex(fromIdx, ctx));
                res.write(dest, ' = ', ctx, '.slice(', fromIdx, ');');
                res.releaseVars(fromIdx);
            }
        } else {
            toIdx = res.acquireVar();
            translateExpression(arrayExpr.toIdx, res, toIdx, ctx);
            res.write(toIdx, ' = ', generateNormalizeArrayIndex(toIdx, ctx));
            res.write(dest, ' = ', ctx, '.slice(0, ', toIdx, ');');
            res.releaseVars(toIdx);
        }
    }

    function generateNormalizeArrayIndex(val, ctx) {
        return [val, ' < 0 ? ', ctx, '.length + ', val, ' : ', val].join('');
    }

    function translateSelector(sel, res, dest, ctx) {
        if(!sel.prop) {
            res.write(dest, ' = ', ctx, ';');
        }
        else {
            var propStr = escapeStr(sel.prop),
                result = res.acquireVar(), i = res.acquireVar(), len = res.acquireVar(),
                curCtx = res.acquireVar(), keys = res.acquireVar(), keysLen = res.acquireVar(),
                j = res.acquireVar(), v = res.acquireVar();

            res.write(result, ' = [], ', i, ' = 0, ', len, ' = ', ctx, '.length;');
            res.write('while(', i, ' < ', len, ') {');
                res.write(curCtx, ' = ', ctx, '[', i, '++];');
                res.write('if(', curCtx, ' != null) {');
                    if(sel.prop == '*') {
                        res.write(keys, ' = Object.keys(', curCtx, ');');
                        res.write(j, ' = 0, ', keysLen, ' = ', keys, '.length;');
                        res.write('while(', j, ' < ', keysLen, ') {');

                            res.write(v, ' = ', curCtx, '[', keys, '[', j, '++]];');
                            res.write(result, ' = ', generateAppendToArray(result, v), ';');

                        res.write('}');
                    } else {
                        res.write(v, ' = ', curCtx, '[', propStr, '];');
                        res.write(result, ' = ', generateAppendToArray(result, v), ';');
                    }
                res.write('}');
            res.write('}');
            res.write(dest, ' = ', result, ';');
            res.releaseVars(result, i, len, curCtx, keys, keysLen, j, v);
        }
    }

    function inlineGetProp(prop, res, dest, curCtx, j, val) {
        res.write('if(', curCtx, ' != null) {');
            if(prop === '*') {
                res.write('for(', j, ' in ', curCtx, ') {');
                    res.write('if(', curCtx, '.hasOwnProperty(', j, ')) {');
                        res.write(val, ' = ', curCtx, '[', j, '];');
                        res.write(generateAppendToArray(dest, val), ';');
                    res.write('}');
                res.write('}');
            }
            else {
                res.write(val, ' = ', curCtx, '[\'' + prop + '\'];');
                res.write('if(typeof ', val, ' !== "undefined") {');
                    res.write(generateAppendToArray(dest, val), ';');
                res.write('}');
            }
        res.write('}');
    }

    function translateDescendantSelector(sel, res, dest, baseCtx) {
        var ctx = res.acquireVar(), curCtx = res.acquireVar(), childCtxs = res.acquireVar(),
            i = res.acquireVar(), j = res.acquireVar(), val = res.acquireVar(),
            vals = res.acquireVar(), len = res.acquireVar(), result = res.acquireVar();
        res.write(ctx, ' = ', baseCtx, '.slice(), ', result, ' = [];');
        res.write('while(', ctx, '.length) {');
            res.write('if(typeof (', curCtx, ' = ', ctx, '.shift()) === \'object\' && ', curCtx, ' !== null) {');
                res.write(childCtxs, ' = [];');
                res.write('if(Array.isArray(', curCtx, ')) {');
                    res.write(i, ' = 0, ', len, ' = ', curCtx, '.length;');
                    res.write('while(', i, ' < ', len, ') {');
                        res.write(val, ' = ', curCtx, '[', i, '++];');
                        res.write(generateAppendToArray(childCtxs, val), ';');
                    res.write('}');
                res.write('}');
                res.write('else {');
                    res.write(vals, ' = [];');
                    inlineGetProp(sel.prop, res, vals, curCtx, j, val);
                    res.write(generateAppendToArray(result, vals), ';');
                    res.write('for(', j, ' in ', curCtx, ') {');
                        res.write('if(', curCtx, '.hasOwnProperty(', j, ')) {');
                            res.write(val, ' = ', curCtx, '[', j, '];');
                            res.write(generateAppendToArray(childCtxs, val), ';');
                        res.write('}');
                    res.write('}');
                res.write('}');
                res.write(childCtxs, '.length && ', ctx, '.unshift.apply(', ctx, ', ', childCtxs, ');');
            res.write('}');

        res.write('}');
        res.write(dest, ' = ', result, ';');
        res.releaseVars(ctx, curCtx, childCtxs, i, j, val, vals, len, result);
    }

    function translateObjectPredicate(expr, res, dest, ctx) {
        var resVar = res.acquireVar(), i = res.acquireVar(), l = res.acquireVar(),
            cond = res.acquireVar(), currentItem = res.acquireVar();
        res.write(resVar, ' = [];');
        res.write(inlineLoopStart(ctx, i, l));

        res.write(currentItem, ' = ', ctx, '[', i, '];');
        translateExpression(expr.arg, res, cond, currentItem);
        res.write(convertToBool(cond), ' && ', resVar, '.push(', currentItem, ');');

        res.write('}');
        res.write(dest, ' = ', resVar);
        res.releaseVars(resVar, i, l, currentItem, cond);
    }

    function translateExpression(expr, res, dest, ctx) {
        switch (expr.type) {
            case SYNTAX.PATH:
                var prop = res.acquireVar();
                translatePath(expr, res, prop, '[' + ctx + ']');
                res.write(dest, ' = ', prop, ';');
                res.releaseVars(prop);
                break;

            case SYNTAX.BINARY_EXPRESSION:
                if(arithmeticOperators[expr.op]) {
                    translateArithmeticExpression(expr, res, dest, ctx);
                } else {
                    translateEqualityExpression(expr, res, dest, ctx);
                }
                break;

            case SYNTAX.LOGICAL_EXPRESSION:
                translateLogicalExpression(expr, res, dest, ctx);
                break;

            case SYNTAX.UNARY_EXPRESSION:
                translateUnaryExpression(expr, res, dest, ctx);
                break;

            case SYNTAX.LITERAL:
                var val = expr.val;
                switch(typeof val) {
                    case "string":
                        res.write(dest, ' = ', escapeStr(val), ';');
                        break;
                    default:
                        res.write(dest, ' = ', val, ';');
                        break;
                }
                break;

            case SYNTAX.SUBST:
                res.write(dest, ' = subst.', expr.name, ';');
                break;
        }
    }

    function translateEqualityExpression(expr, res, dest, ctx) {
        var val1 = res.acquireVar(), val2 = res.acquireVar(),
            isVal1Array = res.acquireVar(), isVal2Array = res.acquireVar(),
            i = res.acquireVar(), j = res.acquireVar(),
            len1 = res.acquireVar(), len2 = res.acquireVar(),
            loop = res.acquireLabel(),
            tmpVal1 = res.acquireVar(), tmpVal2 = res.acquireVar(),
            isComplexOP = complexBinaryOperators[expr.op];

        res.write(dest, ' = false;');

        translateExpression(expr.args[0], res, val1, ctx);
        translateExpression(expr.args[1], res, val2, ctx);

        function writeCondition(val1Expr, val2Expr) {
            if(isComplexOP) {
                res.write(tmpVal1, ' = ', val1Expr);
                res.write(tmpVal2, ' = ', val2Expr);
                res.write('if(', formatBinaryOperator(expr.op, tmpVal1, tmpVal2), ') {');
            }
            else {
                res.write('if(', formatBinaryOperator(expr.op, val1Expr, val2Expr), ') {');
            }
        }

        res.write(isVal1Array, ' = ', 'Array.isArray(', val1, ')');
        res.write(isVal2Array, ' = ', 'Array.isArray(', val2, ')');
        res.write('if(', isVal1Array, ' && ', val1, '.length === 1) {');
            res.write(val1, ' = ', val1, '[0];');
            res.write(isVal1Array, ' = false;');
        res.write('}');
        res.write('if(', isVal2Array, ' && ', val2, '.length === 1) {');
            res.write(val2, ' = ', val2, '[0];');
            res.write(isVal2Array, ' = false;');
        res.write('}');
        res.write(i, ' = 0;');
        res.write('if(', isVal1Array, ') {');
            res.write(len1, ' = ', val1, '.length;');
            res.write('if(', isVal2Array, ') {');
                res.write(len2, ' = ', val2, '.length;');
                res.write(loop, ':');
                res.write('while(', i, ' < ', len1, ') {');
                    res.write(j, ' = 0;');
                    res.write('while(', j, ' < ', len2, ') {');
                        writeCondition([val1, '[', i, ']'].join(''), [val2, '[', j, '++]'].join(''));
                            res.write(dest, ' = true;');
                            res.write('break ', loop, ';');
                        res.write('}');
                    res.write('}');
                    res.write('++', i, ';');
                res.write('}');
            res.write('}');
            res.write('else {');
                res.write('while(', i, ' < ', len1, ') {');
                    writeCondition([val1, '[', i, '++]'].join(''), val2);
                        res.write(dest, ' = true;');
                        res.write('break;');
                    res.write('}');
                res.write('}');
            res.write('}');
        res.write('}');
        res.write('else if(', isVal2Array,') {');
            res.write(len2, ' = ', val2, '.length;');
            res.write('while(', i, ' < ', len2, ') {');
                writeCondition(val1, [val2, '[', i, '++]'].join(''));
                    res.write(dest, ' = true;');
                    res.write('break;');
                res.write('}');
            res.write('}');
        res.write('}');
        res.write('else {');
            res.write(dest, ' = ', formatBinaryOperator(expr.op, val1, val2), ';');
        res.write('}');

        res.releaseVars(val1, val2, isVal1Array, isVal2Array, i, j, len1, len2, tmpVal1, tmpVal2);
    }

    function translateLogicalExpression(expr, res, dest, ctx) {
        var conditionVars = [], l = expr.args.length, i, val;
        res.write(dest, '= false;');
        switch(expr.op) {
            case '&&':
                for(i = 0; i < l; i++) {
                    conditionVars.push(val = res.acquireVar());
                    translateExpression(expr.args[i], res, val, ctx);
                    res.write('if(', convertToBool(val), ') {');
                }
                res.write(dest, ' = true;');
                for(i = 0; i < l; i++) {
                    res.write('}');
                }
                break;

            case '||':
                for(i = 0; i < l; i++) {
                    conditionVars.push(val = res.acquireVar());
                    translateExpression(expr.args[i], res, val, ctx);
                    res.write('if(', convertToBool(val), ') {');
                        res.write(dest, ' = true;');
                    res.write('}');
                    if(i + 1 < l) {
                        res.write('else {');
                    }
                }
                for(i = 0; i < l - 1; i++) {
                    res.write('}');
                }
                break;
        }

        res.releaseVars.apply(res, conditionVars);
    }

    function translateArithmeticExpression(expr, res, dest, ctx) {
        var val1 = res.acquireVar(),
            val2 = res.acquireVar(),
            computedValue1, computedValue2;

        translateExpression(expr.args[0], res, val1, ctx);
        computedValue1 = convertToSingleValue(val1);

        translateExpression(expr.args[1], res, val2, ctx);
        computedValue2 = convertToSingleValue(val2);

        if(complexBinaryOperators[expr.op]) {
            res.write(val1, ' = ', computedValue1 + ';');
            res.write(val2, ' = ', computedValue2 + ';');
            res.write(dest, ' = ', formatBinaryOperator(expr.op, val1, val2), ';');
        }
        else {
            res.write(dest, ' = ', formatBinaryOperator(expr.op, computedValue1, computedValue2), ';');
        }

        res.releaseVars(val1, val2);
    }

    function translateUnaryExpression(expr, res, dest, ctx) {
        var val = res.acquireVar();

        translateExpression(expr.arg, res, val, ctx);

        switch(expr.op) {
            case '!':
                res.write(dest, ' = !', convertToBool(val) + ';');
                break;

            case '-':
                res.write(dest, ' = -', convertToSingleValue(val) + ';');
                break;
        }

        res.releaseVars(val);
    }

    function escapeStr(s) {
        return ['\'', s.replace(/\\/g, '\\\\').replace(/'/g, '\\\''), '\''].join('');
    }

    function generateAppendToArray(arr, val) {
        return ['(typeof ', val, ' !== \'undefined\'? ',
            '(Array.isArray(', val, ')? ',
                arr, ' = ', arr, '.concat(', val, ') : ',
                '(', arr, '.push(', val, '), ', arr, '))',
        ' : ', arr, ')'].join('');
    }

    function convertToBool(varName) {
        return ['(Array.isArray(', varName, ') ? ', varName, '.length > 0 : !!', varName, ')'].join('');
    }

    function convertToSingleValue(varName) {
        return ['(Array.isArray(', varName, ') ? ', varName, '[0] : ', varName, ')'].join('');
    }

    function inlineLoopStart(arr, i, l) {
        return ['for(', i, ' = 0, ', l, ' = ', arr, '.length; ', i, ' < ', l, '; ', i, '++) {'].join('');
    }

    function formatBinaryOperator(operator, val1, val2) {
        return binaryOperators[operator].replace(/\$1/g, val1).replace(/\$2/g, val2);
    }

    var binaryOperators = {
            '===' : '$1 === $2',
            '=='  : 'typeof $1 === \'string\' && typeof $2 === \'string\'? $1.toLowerCase() === $2.toLowerCase() : $1 == $2',
            '>='  : '$1 >= $2',
            '>'   : '$1 > $2',
            '<='  : '$1 <= $2',
            '<'   : '$1 < $2',
            '!==' : '$1 !== $2',
            '!='  : '$1 != $2',
            '^==' : 'typeof $1 === \'string\' && typeof $2 === \'string\' && $1.indexOf($2) === 0',
            '^='  : '$1 !== null && $2 !== null && $1.toString().toLowerCase().indexOf($2.toString().toLowerCase()) === 0',
            '$==' : 'typeof $1 === \'string\' && typeof $2 === \'string\' && $1.lastIndexOf($2) === $1.length - $2.length',
            '$='  : [
                '(function(val1, val2) {',
                    'if(val1 === null || val2 === null) {',
                        'return false;',
                    '}',
                    'var val1Str = val1.toString().toLowerCase(),',
                        'val2Str = val2.toString().toLowerCase();',
                    'return val1Str.lastIndexOf(val2Str) === val1Str.length - val2Str.length;',
                '})($1, $2)'].join(''),
            '*==' : 'typeof $1 === \'string\' && typeof $2 === \'string\' && $1.indexOf($2) > -1',
            '*='  : '$1 !== null && $2 !== null && $1.toString().toLowerCase().indexOf($2.toString().toLowerCase()) > -1',
            '+'   : '$1 + $2',
            '-'   : '$1 - $2',
            '*'   : '$1 * $2',
            '/'   : '$1 / $2',
            '%'   : '$1 % $2'
        },
        complexBinaryOperators = {
            '=='  : true,
            '^==' : true,
            '^='  : true,
            '$==' : true,
            '*==' : true,
            '*='  : true
        },
        arithmeticOperators = {
            '+' : true,
            '-' : true,
            '*' : true,
            '/' : true,
            '%' : true
        };

    function TranslateResult() {
        this.header = [];
        this.body = [];
        this.vars = [];
        this._lastVarId = 0;
        this._lastLabelId = 0;
        this._unusedVars = [];
    }

    TranslateResult.prototype = {
        acquireVar : function() {
            if(this._unusedVars.length) {
                return this._unusedVars.shift();
            }

            var varName = 'v' + ++this._lastVarId;
            this.vars.push(varName);
            return varName;
        },

        acquireLabel : function() {
            return 'lbl' + ++this._lastLabelId;
        },

        releaseVars : function() {
            for(var i = 0, l = arguments.length; i < l; i++) {
                this._unusedVars.push(arguments[i]);
            }
        },

        write : function() {
            this.body.push(Array.prototype.join.call(arguments, ''));
        }
    };

    return translate;
})();

function build(path) {
    var code = translate(parse(path));
    return new Function('data,subst', code);
}

var MAX_CACHE_SIZE = 100,
    cache = {},
    cacheKeys = [];

exports.apply = function(path, ctx, substs) {
    if(!cache[path]) {
        cache[path] = build(path);
        if(cacheKeys.push(path) > MAX_CACHE_SIZE) {
            delete cache[cacheKeys.shift()];
        }
    }

    return cache[path](ctx, substs || {});
};

});