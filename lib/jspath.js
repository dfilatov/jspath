/**
* JSPath
*
* Copyright (c) 2012 Filatov Dmitry (dfilatov@yandex-team.ru)
* With parts by Marat Dulin (mdevils@gmail.com)
* Dual licensed under the MIT and GPL licenses:
* http://www.opensource.org/licenses/mit-license.php
* http://www.gnu.org/licenses/gpl.html
*
* @version 0.1.1
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

var SYNTAX = {
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
    };

// parser

var parse = (function() {

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
            type     : SYNTAX.SELECTOR,
            selector : selector,
            prop     : prop
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
        if(buf !== null) {
            return buf;
        }

        var pos = idx;
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
        if(token ||
                (token = scanString()) ||
                (token = scanString()) ||
                (token = scanNumeric()) ||
                (token = scanId())) {
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

    function isDigit(ch) {
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
            id = ch;

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

        if(isFloat || isDigit(ch)) {
            var num = ch;
            while(++idx < len) {
                ch = path[idx];
                if(ch === '.') {
                    if(isFloat) {
                        return;
                    }
                    isFloat = true;
                }
                else if(!isDigit(ch)) {
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
            if(isDigit(ch2)) {
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

    return parse;
})();

// translator

var translate = (function() {

    var body, vars, lastVarId, unusedVars;

    function acquireVar() {
        if(unusedVars.length) {
            return unusedVars.shift();
        }

        var varName = 'v' + ++lastVarId;
        vars.push(varName);
        return varName;
    }

    function releaseVars() {
        for(var i = 0, len = arguments.length; i < len; i++) {
            unusedVars.push(arguments[i]);
        }
    }

    function translate(ast) {
        body = [];
        vars = ['res'];
        lastVarId = 0;
        unusedVars = [];

        translatePath(ast, 'res', 'data', true);
        return 'data = Array.isArray(data)? data : [data];' +
            (vars.length? 'var ' + vars.join(',') + ';' : '') +
            body.join('') +
            'return res;';
    }

    function translatePath(path, dest, ctx, isTopLevel) {
        var resVar = acquireVar(),
            parts = path.parts,
            i = 0, len = parts.length;

        body.push(resVar, '=', path.fromRoot? 'data' : ctx, ';');

        while(i < len) {
            var item = parts[i++];
            switch(item.type) {
                case SYNTAX.SELECTOR:
                    item.selector == '..'?
                        translateDescendantSelector(item, resVar, resVar) :
                        translateSelector(item, resVar, resVar);
                    break;

                case SYNTAX.OBJECT_PREDICATE:
                    body.push(translateObjectPredicate(item, resVar, resVar));
                    break;

                case SYNTAX.ARRAY_PREDICATE:
                    body.push(translateArrayPredicate(item, resVar, resVar));
                    break;
            }
            isTopLevel && body.push(
                'if(!', resVar, '.length) {',
                    'return ', resVar, ';',
                '}');
        }

        body.push(dest, '=', resVar, ';');
        releaseVars(resVar);
    }

    function translateArrayPredicate(item, dest, ctx) {
        var arrayExpr = item.arg, fromIdx, toIdx;
        if(arrayExpr.idx) {
            var idx = acquireVar();
            translateExpression(arrayExpr.idx, idx, ctx);
            body.push(
                idx, '=', generateNormalizeArrayIndex(idx, ctx), ';',
                dest, '=', ctx, '[', idx, '] == null? [] : [', ctx, '[', idx, ']];');
            releaseVars(idx);
        }
        else if(arrayExpr.fromIdx) {
            if(arrayExpr.toIdx) {
                fromIdx = acquireVar();
                toIdx = acquireVar();
                translateExpression(arrayExpr.fromIdx, fromIdx, ctx);
                translateExpression(arrayExpr.toIdx, toIdx, ctx);
                body.push(
                    fromIdx, '=', generateNormalizeArrayIndex(fromIdx, ctx), ';',
                    toIdx, '=', generateNormalizeArrayIndex(toIdx, ctx), ';',
                    dest, '=', ctx, '.slice(', fromIdx, ', ', toIdx, ');');
                releaseVars(fromIdx, toIdx);
            }
            else {
                fromIdx = acquireVar();
                translateExpression(arrayExpr.fromIdx, fromIdx, ctx);
                body.push(
                    fromIdx, '=', generateNormalizeArrayIndex(fromIdx, ctx), ';',
                    dest, '=', ctx, '.slice(', fromIdx, ');');
                releaseVars(fromIdx);
            }
        }
        else {
            toIdx = acquireVar();
            translateExpression(arrayExpr.toIdx, toIdx, ctx);
            body.push(
                toIdx, '=', generateNormalizeArrayIndex(toIdx, ctx), ';',
                dest, '=', ctx, '.slice(0, ', toIdx, ');');
            releaseVars(toIdx);
        }
    }

    function generateNormalizeArrayIndex(val, ctx) {
        return [val, '< 0?', ctx, '.length +', val, ':', val].join('');
    }

    function translateSelector(sel, dest, ctx) {
        if(!sel.prop) {
            body.push(dest, '=', ctx, ';');
        }
        else {
            var propStr = escapeStr(sel.prop),
                res = acquireVar(), i = acquireVar(), len = acquireVar(),
                curCtx = acquireVar(),
                j = acquireVar(), val = acquireVar();

            body.push(
                res, '= [],', i, '= 0,', len, '=', ctx, '.length;',
                'while(', i, '<', len, ') {',
                curCtx, '=', ctx, '[', i, '++];',
                'if(', curCtx, '!= null) {');
                    sel.prop === '*'?
                        body.push(
                            'for(', j, ' in ', curCtx, ') {',
                                'if(', curCtx, '.hasOwnProperty(', j, ')) {',
                                    val, '=', curCtx, '[', j, '];',
                                    generateAppendToArray(res, val),
                                '}',
                            '}') :
                        body.push(
                            val, '=', curCtx, '[', propStr, '];',
                            generateAppendToArray(res, val));
                body.push('}',
                '}',
                dest, '=', res, ';');

            releaseVars(res, i, len, curCtx, j, val);
        }
    }

    function inlineGetProp(prop, dest, curCtx, j, val) {
        body.push('if(', curCtx, '!= null) {');

        prop === '*'?
            body.push(
                'for(', j, ' in ', curCtx, ') {',
                    'if(', curCtx, '.hasOwnProperty(', j, ')) {',
                        val, '=', curCtx, '[', j, '];',
                        generateAppendToArray(dest, val),
                    '}',
                '}') :
            body.push(
                val, '=', curCtx, '["' + prop + '"];',
                generateAppendToArray(dest, val));

        body.push('}');
    }

    function translateDescendantSelector(sel, dest, baseCtx) {
        var ctx = acquireVar(), curCtx = acquireVar(), childCtxs = acquireVar(),
            i = acquireVar(), j = acquireVar(), val = acquireVar(),
            vals = acquireVar(), len = acquireVar(), result = acquireVar();

        body.push(
            ctx, '=', baseCtx, '.slice(),', result, '= [];',
            'while(', ctx, '.length) {',
                'if(typeof (', curCtx, '=', ctx, '.shift()) === "object" &&', curCtx, ') {',
                    childCtxs, '= [];',
                    'if(Array.isArray(', curCtx, ')) {',
                        i, '= 0,', len, '=', curCtx, '.length;',
                        'while(', i, '<', len, ') {',
                            val, '=', curCtx, '[', i, '++];',
                            generateAppendToArray(childCtxs, val),
                        '}',
                    '}',
                    'else {',
                        vals, '= [];');
                        inlineGetProp(sel.prop, vals, curCtx, j, val);
                    body.push(
                        generateAppendToArray(result, vals),
                        'for(', j, ' in ', curCtx, ') {',
                            'if(', curCtx, '.hasOwnProperty(', j, ')) {',
                                val, '=', curCtx, '[', j, '];',
                                generateAppendToArray(childCtxs, val),
                            '}',
                        '}',
                    '}',
                    childCtxs, '.length &&', ctx, '.unshift.apply(', ctx, ',', childCtxs, ');',
                '}',
            '}',
            dest, '=', result, ';');

        releaseVars(ctx, curCtx, childCtxs, i, j, val, vals, len, result);
    }

    function translateObjectPredicate(expr, dest, ctx) {
        var resVar = acquireVar(), i = acquireVar(), len = acquireVar(),
            cond = acquireVar(), currentItem = acquireVar();

        body.push(
            resVar, '= [];',
            i, '= 0;',
            len, '=', ctx, '.length;',
            'while(', i, '<', len, ') {',
                currentItem, '=', ctx, '[', i, '];');

        translateExpression(expr.arg, cond, currentItem);

        body.push(
                convertToBool(expr.arg, cond), '&&', resVar, '.push(', currentItem, ');',
                '++', i, ';',
            '}',
            dest, '=', resVar, ';');

        releaseVars(resVar, i, len, currentItem, cond);
    }

    function translateExpression(expr, dest, ctx) {
        switch(expr.type) {
            case SYNTAX.PATH:
                var prop = acquireVar();
                translatePath(expr, prop, '[' + ctx + ']');
                body.push(dest, '=', prop, ';');
                releaseVars(prop);
                break;

            case SYNTAX.BINARY_EXPRESSION:
                arithmeticOperators[expr.op]?
                    translateArithmeticExpression(expr, dest, ctx) :
                    translateEqualityExpression(expr, dest, ctx);
                break;

            case SYNTAX.LOGICAL_EXPRESSION:
                translateLogicalExpression(expr, dest, ctx);
                break;

            case SYNTAX.UNARY_EXPRESSION:
                translateUnaryExpression(expr, dest, ctx);
                break;

            case SYNTAX.LITERAL:
                var val = expr.val;
                switch(typeof val) {
                    case 'string':
                        body.push(dest, '=', escapeStr(val), ';');
                        break;

                    default:
                        body.push(dest, '=', val, ';');
                        break;
                }
                break;

            case SYNTAX.SUBST:
                body.push(dest, '= subst.', expr.name, ';');
                break;
        }
    }

    function translateEqualityExpression(expr, dest, ctx) {
        var val1 = acquireVar(), val2 = acquireVar(),
            isVal1Array = acquireVar(), isVal2Array = acquireVar(),
            i = acquireVar(), j = acquireVar(),
            len1 = acquireVar(), len2 = acquireVar(),
            leftArg = expr.args[0], rightArg = expr.args[1];

        body.push(dest, '= false;');

        translateExpression(leftArg, val1, ctx);
        translateExpression(rightArg, val2, ctx);

        var isLeftArgPath = leftArg.type === SYNTAX.PATH,
            isRightArgLiteral = rightArg.type === SYNTAX.LITERAL;

        body.push(isVal1Array, '=');
        isLeftArgPath? body.push('true;') : body.push('Array.isArray(', val1, ');');

        body.push(isVal2Array, '=');
        isRightArgLiteral? body.push('false;') : body.push('Array.isArray(', val2, ');');

        body.push(
            'if(', isVal1Array, '&&', val1, '.length === 1) {',
                val1, '=', val1, '[0];',
                isVal1Array, '= false;',
            '}');
        isRightArgLiteral || body.push(
            'if(', isVal2Array, '&&', val2, '.length === 1) {',
                val2, '=', val2, '[0];',
                isVal2Array, '= false;',
            '}');

        body.push(i, '= 0;',
            'if(', isVal1Array, ') {',
                len1, '=', val1, '.length;');

        if(!isRightArgLiteral) {
            body.push(
                'if(', isVal2Array, ') {',
                    len2, '=', val2, '.length;',
                    'while(', i, '<', len1, '&& !', dest, ') {',
                        j, '= 0;',
                        'while(', j, '<', len2, ') {');
                            writeCondition(expr.op, [val1, '[', i, ']'].join(''), [val2, '[', j, ']'].join(''));
                            body.push(
                                dest, '= true;',
                                'break;',
                            '}',
                            '++', j, ';',
                        '}',
                        '++', i, ';',
                    '}',
                '}',
                'else {');
        }
        body.push(
                    'while(', i, '<', len1, ') {');
                        writeCondition(expr.op, [val1, '[', i, ']'].join(''), val2);
                        body.push(
                            dest, '= true;',
                            'break;',
                        '}',
                        '++', i, ';',
                    '}');

        isRightArgLiteral || body.push(
                '}');

        body.push(
            '}');

        if(!isRightArgLiteral) {
            body.push(
            'else if(', isVal2Array,') {',
                len2, '=', val2, '.length;',
                'while(', i, '<', len2, ') {');
                    writeCondition(expr.op, val1, [val2, '[', i, ']'].join(''));
            body.push(
                        dest, '= true;',
                        'break;',
                    '}',
                    '++', i, ';',
                '}',
            '}');
        }

        body.push(
            'else {',
                dest, '=', binaryOperators[expr.op](val1, val2), ';',
            '}');

        releaseVars(val1, val2, isVal1Array, isVal2Array, i, j, len1, len2);
    }

    function writeCondition(op, val1Expr, val2Expr) {
        body.push('if(', binaryOperators[op](val1Expr, val2Expr), ') {');
    }

    function translateLogicalExpression(expr, dest, ctx) {
        var conditionVars = [],
            args = expr.args, l = args.length,
            i = 0, val;

        body.push(dest, '= false;');
        switch(expr.op) {
            case '&&':
                while(i < l) {
                    conditionVars.push(val = acquireVar());
                    translateExpression(args[i], val, ctx);
                    body.push('if(', convertToBool(args[i++], val), ') {');
                }
                body.push(dest, '= true;');
                break;

            case '||':
                while(i < l) {
                    conditionVars.push(val = acquireVar());
                    translateExpression(args[i], val, ctx);
                    body.push(
                        'if(', convertToBool(args[i], val), ') {',
                            dest, '= true;',
                        '}');
                    if(i++ + 1 < l) {
                        body.push('else {');
                    }
                }
                --l;
                break;
        }

        while(l--) {
            body.push('}');
        }

        releaseVars.apply(conditionVars);
    }

    function translateArithmeticExpression(expr, dest, ctx) {
        var val1 = acquireVar(),
            val2 = acquireVar();

        translateExpression(expr.args[0], val1, ctx);
        translateExpression(expr.args[1], val2, ctx);

        body.push(
            dest, '=',
            binaryOperators[expr.op](
                convertToSingleValue(expr.args[0], val1),
                convertToSingleValue(expr.args[1], val2)),
            ';');

        releaseVars(val1, val2);
    }

    function translateUnaryExpression(expr, dest, ctx) {
        var val = acquireVar();

        translateExpression(expr.arg, val, ctx);

        switch(expr.op) {
            case '!':
                body.push(dest, '= !', convertToBool(expr.arg, val) + ';');
                break;

            case '-':
                body.push(dest, '= -', convertToSingleValue(expr.arg, val) + ';');
                break;
        }

        releaseVars(val);
    }

    function escapeStr(s) {
        return '\'' + s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'') + '\'';
    }

    function generateAppendToArray(arr, val) {
        return [
            val, '!= null &&',
            '(Array.isArray(', val, ')? ',
                arr, '=', arr, '.concat(', val, ') :',
                arr, '.push(', val, ')',
            ');'].join('');
    }

    function convertToBool(arg, varName) {
        switch(arg.type) {
            case SYNTAX.LOGICAL_EXPRESSION:
                return varName;

            case SYNTAX.LITERAL:
                return '!!' + varName;

            case SYNTAX.PATH:
                return varName + '.length > 0';

            default:
                return ['(typeof ', varName, '=== "boolean"?',
                    varName, ':',
                    'Array.isArray(', varName, ')?', varName, '.length > 0 : !!', varName, ')'].join('');
        }
    }

    function convertToSingleValue(arg, varName) {
        switch(arg.type) {
            case SYNTAX.LITERAL:
                return varName;

            case SYNTAX.PATH:
                return varName + '[0]';

            default:
                return ['(Array.isArray(', varName, ')?', varName, '[0] : ', varName, ')'].join('');
        }
    }

    var binaryOperators = {
            '===' : function(val1, val2) {
                return val1 + '===' + val2;
            },

            '==' : function(val1, val2) {
                return 'typeof ' + val1 + '=== "string" && typeof ' + val2 + '=== "string"?' +
                    val1 + '.toLowerCase() ===' + val2 + '.toLowerCase() :' +
                    val1 + '==' + val2;
            },

            '>=' : function(val1, val2) {
                return val1 + '>=' + val2;
            },

            '>' : function(val1, val2) {
                return val1 + '>' + val2;
            },

            '<=' : function(val1, val2) {
                return val1 + '<=' + val2;
            },

            '<' : function(val1, val2) {
                return val1 + '<' + val2;
            },

            '!==' : function(val1, val2) {
                return val1 + '!==' + val2;
            },

            '!=' : function(val1, val2) {
                return val1 + '!=' + val2;
            },

            '^==' : function(val1, val2) {
                return ['typeof ', val1, '=== "string" && typeof ', val2 + '=== "string" &&',
                    val1, '.indexOf(', val2, ') === 0'].join('');
            },

            '^=' : function(val1, val2) {
                return [val1, '!= null &&', val2, '!= null &&',
                    val1, '.toString().toLowerCase().indexOf(', val2, '.toString().toLowerCase()) === 0'].join('');
            },

            '$==' : function(val1, val2) {
                return ['typeof ', val1, '=== "string" && typeof ', val2, '=== "string" &&',
                    val1, '.lastIndexOf(', val2, ') ===', val1, '.length - ', val2, '.length'].join('');
            },

            '$=' : function(val1, val2) {
                return [val1, '!= null &&', val2, '!= null &&',
                    '(', val1, '=', val1, '.toLowerCase().toString()).indexOf(',
                    '(', val2, '=', val2, '.toLowerCase().toLowerCase())) ===',
                    val1, '.length -', val2, '.length'].join('');
            },

            '*==' : function(val1, val2) {
                return ['typeof ', val1, '=== "string" && typeof ', val2, '=== "string" &&',
                    val1, '.indexOf(', val2, ') > -1'].join('');
            },

            '*=' : function(val1, val2) {
                return [val1, '!= null && ', val2, '!= null &&',
                    val1, '.toString().toLowerCase().indexOf(', val2, '.toString().toLowerCase()) > -1'].join('');
            },

            '+' : function(val1, val2) {
                return val1 + '+' + val2;
            },

            '-' : function(val1, val2) {
                return val1 + '-' + val2;
            },

            '*' : function(val1, val2) {
                return val1 + '*' + val2;
            },

            '/' : function(val1, val2) {
                return val1 + '/' + val2;
            },

            '%' : function(val1, val2) {
                return val1 + '%' + val2;
            }
        },
        arithmeticOperators = { '+' : 1, '-' : 1, '*' : 1, '/' : 1, '%' : 1 };

    return translate;
})();

function compile(path) {
    return Function('data,subst', translate(parse(path)));
}

exports.compile = compile;

var MAX_CACHE_SIZE = 100,
    cache = {},
    cacheKeys = [];

exports.apply = function(path, ctx, substs) {
    if(!cache[path]) {
        cache[path] = compile(path);
        if(cacheKeys.push(path) > MAX_CACHE_SIZE) {
            delete cache[cacheKeys.shift()];
        }
    }

    return cache[path](ctx, substs || {});
};

});
