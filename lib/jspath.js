/**
* JSPath
*
* Copyright (c) 2012 Filatov Dmitry (dfilatov@yandex-team.ru)
* With parts by Marat Dulin (mdevils@gmail.com)
* Dual licensed under the MIT and GPL licenses:
* http://www.opensource.org/licenses/mit-license.php
* http://www.gnu.org/licenses/gpl.html
*
* @version 0.3.4
*/

(function() {

var SYNTAX = {
        PATH            : 1,
        SELECTOR        : 2,
        OBJ_PRED        : 3,
        POS_PRED        : 4,
        LOGICAL_EXPR    : 5,
        COMPARISON_EXPR : 6,
        MATH_EXPR       : 7,
        CONCAT_EXPR     : 8,
        UNARY_EXPR      : 9,
        POS_EXPR        : 10,
        LITERAL         : 11
    };

// parser

var parse = (function() {

    var TOKEN = {
            ID    : 1,
            NUM   : 2,
            STR   : 3,
            BOOL  : 4,
            PUNCT : 5,
            EOP   : 6
        },
        MESSAGES = {
            UNEXP_TOKEN : 'Unexpected token "%0"',
            UNEXP_EOP   : 'Unexpected end of path'
        };

    var path, idx, buf, len;

    function parse(_path) {
        path = _path.split('');
        idx = 0;
        buf = null;
        len = path.length;

        var res = parsePathConcatExpr(),
            token = lex();

        if(token.type !== TOKEN.EOP) {
            throwUnexpected(token);
        }

        return res;
    }

    function parsePathConcatExpr() {
        var expr = parsePathConcatPartExpr(),
            operands;

        while(match('|')) {
            lex();
            (operands || (operands = [expr])).push(parsePathConcatPartExpr());
        }

        return operands?
            {
                type : SYNTAX.CONCAT_EXPR,
                args : operands
            } :
            expr;
    }

    function parsePathConcatPartExpr() {
        return match('(')?
            parsePathGroupExpr() :
            parsePath();
    }

    function parsePathGroupExpr() {
        expect('(');
        var expr = parsePathConcatExpr();
        expect(')');

        var parts = [],
            part;
        while(part = parsePredicate()) {
            parts.push(part);
        }

        if(!parts.length) {
            return expr;
        }
        else if(expr.type === SYNTAX.PATH) {
            expr.parts = expr.parts.concat(parts);
            return expr;
        }

        parts.unshift(expr);

        return {
            type  : SYNTAX.PATH,
            parts : parts
        };
    }

    function parsePredicate() {
        if(match('[')) {
            return parsePosPredicate();
        }

        if(match('{')) {
            return parseObjectPredicate();
        }

        if(match('(')) {
            return parsePathGroupExpr();
        }
    }

    function parsePath() {
        if(!matchPath()) {
            throwUnexpected(lex());
        }

        var fromRoot = false,
            subst;

        if(match('^')) {
            lex();
            fromRoot = true;
        }
        else if(matchSubst()) {
            subst = lex().val.substr(1);
        }

        var parts = [],
            part;
        while(part = parsePathPart()) {
            parts.push(part);
        }

        return {
            type     : SYNTAX.PATH,
            fromRoot : fromRoot,
            subst    : subst,
            parts    : parts
        };
    }

    function parsePathPart() {
        return matchSelector()?
            parseSelector() :
            parsePredicate();
    }

    function parseSelector() {
        var selector = lex().val,
            token = lookahead(),
            prop;

        if(match('*') || token.type === TOKEN.ID || token.type === TOKEN.STR) {
            prop = lex().val;
        }

        return {
            type     : SYNTAX.SELECTOR,
            selector : selector,
            prop     : prop
        };
    }

    function parsePosPredicate() {
        expect('[');
        var expr = parsePosExpr();
        expect(']');

        return {
            type : SYNTAX.POS_PRED,
            arg  : expr
        };
    }

    function parseObjectPredicate() {
        expect('{');
        var expr = parseLogicalORExpr();
        expect('}');

        return {
            type : SYNTAX.OBJ_PRED,
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
                type : SYNTAX.LOGICAL_EXPR,
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
                type : SYNTAX.LOGICAL_EXPR,
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
                type : SYNTAX.COMPARISON_EXPR,
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
                type : SYNTAX.COMPARISON_EXPR,
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
                type : SYNTAX.MATH_EXPR,
                op   : lex().val,
                args : [expr, parseMultiplicativeExpr()]
            };
        }

        return expr;
    }

    function parseMultiplicativeExpr() {
        var expr = parseUnaryExpr();

        while(match('*') || match('/') || match('%')) {
            expr = {
                type : SYNTAX.MATH_EXPR,
                op   : lex().val,
                args : [expr, parseMultiplicativeExpr()]
            };
        }

        return expr;
    }

    function parsePosExpr() {
        if(match(':')) {
            lex();
            return {
                type  : SYNTAX.POS_EXPR,
                toIdx : parseUnaryExpr()
            };
        }

        var fromExpr = parseUnaryExpr();
        if(match(':')) {
            lex();
            if(match(']')) {
                return {
                    type    : SYNTAX.POS_EXPR,
                    fromIdx : fromExpr
                };
            }

            return {
                type    : SYNTAX.POS_EXPR,
                fromIdx : fromExpr,
                toIdx   : parseUnaryExpr()
            };
        }

        return {
            type : SYNTAX.POS_EXPR,
            idx  : fromExpr
        };
    }

    function parseUnaryExpr() {
        if(match('!') || match('-')) {
            return {
                type : SYNTAX.UNARY_EXPR,
                op   : lex().val,
                arg  : parseUnaryExpr()
            };
        }

        return parsePrimaryExpr();
    }

    function parsePrimaryExpr() {
        var token = lookahead(),
            type = token.type;

        if(type === TOKEN.STR || type === TOKEN.NUM || type === TOKEN.BOOL) {
            return {
                type : SYNTAX.LITERAL,
                val  : lex().val
            };
        }

        if(matchPath()) {
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
        return token.type === TOKEN.PUNCT && token.val === val;
    }

    function matchPath() {
        return matchSelector() || matchSubst() || match('^');
    }

    function matchSelector() {
        var token = lookahead();
        if(token.type === TOKEN.PUNCT) {
            var val = token.val;
            return val === '.' || val === '..';
        }

        return false;
    }

    function matchSubst() {
        var token = lookahead();
        return token.type === TOKEN.ID && token.val[0] === '$';
    }

    function expect(val) {
        var token = lex();
        if(token.type !== TOKEN.PUNCT || token.val !== val) {
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
                (token = scanId()) ||
                (token = scanString()) ||
                (token = scanNumeric())) {
            return token;
        }

        token = { range : [idx, idx] };
        idx >= len?
            token.type = TOKEN.EOP :
            token.val = path[idx];

        throwUnexpected(token);
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
        return (ch === '$') || (ch === '@') || (ch === '_') || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
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
                type  : TOKEN.BOOL,
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
        if(path[idx] !== '"' && path[idx] !== "'") {
            return;
        }

        var orig = path[idx],
            start = ++idx,
            str = '',
            eosFound = false,
            ch;

        while(idx < len) {
            ch = path[idx++];
            if(ch === '\\') {
                ch = path[idx++];
            }
            else if((ch === '"' || ch === "'") && ch === orig) {
                eosFound = true;
                break;
            }
            str += ch;
        }

        if(eosFound) {
            return {
                type : TOKEN.STR,
                val : str,
                range : [start, idx]
            };
        }
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
                type  : TOKEN.NUM,
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
                    type  : TOKEN.PUNCT,
                    val   : '..',
                    range : [start, ++idx]
                } :
                {
                    type  : TOKEN.PUNCT,
                    val   : '.',
                    range : [start, idx]
                };
        }

        if(ch2 === '=') {
            var ch3 = path[idx + 2];
            if(ch3 === '=') {
                if('=!^$*'.indexOf(ch1) >= 0) {
                    return {
                        type  : TOKEN.PUNCT,
                        val   : ch1 + ch2 + ch3,
                        range : [start, idx += 3]
                    };
                }
            }
            else if('=!^$*><'.indexOf(ch1) >= 0) {
                return {
                    type  : TOKEN.PUNCT,
                    val   : ch1 + ch2,
                    range : [start, idx += 2]
                };
            }
        }

        if(ch1 === ch2 && (ch1 === '|' || ch1 === '&')) {
            return {
                type  : TOKEN.PUNCT,
                val   : ch1 + ch2,
                range : [start, idx += 2]
            };
        }

        if(':{}()[]^+-*/%!><|'.indexOf(ch1) >= 0) {
            return {
                type  : TOKEN.PUNCT,
                val   : ch1,
                range : [start, ++idx]
            };
        }
    }

    function throwUnexpected(token) {
        if(token.type === TOKEN.EOP) {
            throwError(token, MESSAGES.UNEXP_EOP);
        }

        throwError(token, MESSAGES.UNEXP_TOKEN, token.val);
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
        var args = arguments, i = args.length;
        while(i--) {
            unusedVars.push(args[i]);
        }
    }

    function translate(ast) {
        body = [];
        vars = ['res'];
        lastVarId = 0;
        unusedVars = [];

        translateExpr(ast, 'res', 'data');

        body.unshift(
            'var ',
            Array.isArray?
                'isArr = Array.isArray' :
                'toStr = Object.prototype.toString, isArr = function(o) { return toStr.call(o) === "[object Array]"; }',
                ', concat = Array.prototype.concat',
                ',', vars.join(','), ';');

        if(ast.type === SYNTAX.PATH) {
            var lastPart = ast.parts[ast.parts.length - 1];
            if(lastPart && lastPart.type === SYNTAX.POS_PRED && 'idx' in lastPart.arg) {
                body.push('res = res[0];');
            }
        }

        body.push('return res;');

        return body.join('');
    }

    function translatePath(path, dest, ctx) {
        var parts = path.parts,
            i = 0, len = parts.length;

        body.push(
            dest, '=', path.fromRoot? 'data' : path.subst? 'subst.' + path.subst : ctx, ';',
            'isArr(' + dest + ') || (' + dest + ' = [' + dest + ']);');

        while(i < len) {
            var item = parts[i++];
            switch(item.type) {
                case SYNTAX.SELECTOR:
                    item.selector === '..'?
                        translateDescendantSelector(item, dest, dest) :
                        translateSelector(item, dest, dest);
                    break;

                case SYNTAX.OBJ_PRED:
                    translateObjectPredicate(item, dest, dest);
                    break;

                case SYNTAX.POS_PRED:
                    translatePosPredicate(item, dest, dest);
                    break;

                case SYNTAX.CONCAT_EXPR:
                    translateConcatExpr(item, dest, dest);
                    break;
            }
        }
    }

    function translateSelector(sel, dest, ctx) {
        if(sel.prop) {
            var propStr = escapeStr(sel.prop),
                res = acquireVar(), i = acquireVar(), len = acquireVar(),
                curCtx = acquireVar(),
                j = acquireVar(), val = acquireVar(), tmpArr = acquireVar();

            body.push(
                res, '= [];', i, '= 0;', len, '=', ctx, '.length;', tmpArr, '= [];',
                'while(', i, '<', len, ') {',
                    curCtx, '=', ctx, '[', i, '++];',
                    'if(', curCtx, '!= null) {');
            if(sel.prop === '*') {
                body.push(
                        'if(typeof ', curCtx, '=== "object") {',
                            'if(isArr(', curCtx, ')) {',
                                res, '=', res, '.concat(', curCtx, ');',
                            '}',
                            'else {',
                                'for(', j, ' in ', curCtx, ') {',
                                    'if(', curCtx, '.hasOwnProperty(', j, ')) {',
                                        val, '=', curCtx, '[', j, '];');
                                        inlineAppendToArray(res, val);
                    body.push(
                                    '}',
                                '}',
                            '}',
                        '}');
            }
            else {
                body.push(
                        val, '=', curCtx, '[', propStr, '];');
                        inlineAppendToArray(res, val, tmpArr, len);
            }
            body.push(
                    '}',
                '}',
                dest, '=', len, '> 1 &&', tmpArr, '.length?', tmpArr, '.length > 1?',
                    'concat.apply(', res, ',', tmpArr, ') :', res, '.concat(', tmpArr, '[0]) :', res, ';');

            releaseVars(res, i, len, curCtx, j, val, tmpArr);
        }
    }

    function translateDescendantSelector(sel, dest, baseCtx) {
        var prop = sel.prop,
            ctx = acquireVar(), curCtx = acquireVar(), childCtxs = acquireVar(),
            i = acquireVar(), j = acquireVar(), val = acquireVar(),
            len = acquireVar(), res = acquireVar();

        body.push(
            ctx, '=', baseCtx, '.slice(),', res, '= [];',
            'while(', ctx, '.length) {',
                curCtx, '=', ctx, '.shift();');
        prop?
            body.push(
                'if(typeof ', curCtx, '=== "object" &&', curCtx, ') {') :
            body.push(
                'if(typeof ', curCtx, '!= null) {');
        body.push(
                    childCtxs, '= [];',
                    'if(isArr(', curCtx, ')) {',
                        i, '= 0,', len, '=', curCtx, '.length;',
                        'while(', i, '<', len, ') {',
                            val, '=', curCtx, '[', i, '++];');
        prop && body.push(
                            'if(typeof ', val, '=== "object") {');
                                inlineAppendToArray(childCtxs, val);
        prop && body.push(
                            '}');
        body.push(
                        '}',
                    '}',
                    'else {');
        if(prop) {
            if(prop !== '*') {
                body.push(
                        val, '=', curCtx, '["' + prop + '"];');
                        inlineAppendToArray(res, val);
            }
        }
        else {
                        inlineAppendToArray(res, curCtx);
            body.push(
                        'if(typeof ', curCtx, '=== "object") {');
        }

        body.push(
                            'for(', j, ' in ', curCtx, ') {',
                                'if(', curCtx, '.hasOwnProperty(', j, ')) {',
                                    val, '=', curCtx, '[', j, '];');
                                    inlineAppendToArray(childCtxs, val);
                                    prop === '*' && inlineAppendToArray(res, val);
        body.push(
                                '}',
                            '}');
        prop || body.push(
                        '}');
        body.push(
                    '}',
                    childCtxs, '.length &&', ctx, '.unshift.apply(', ctx, ',', childCtxs, ');',
                '}',
            '}',
            dest, '=', res, ';');

        releaseVars(ctx, curCtx, childCtxs, i, j, val, len, res);
    }

    function translateObjectPredicate(expr, dest, ctx) {
        var resVar = acquireVar(), i = acquireVar(), len = acquireVar(),
            cond = acquireVar(), curItem = acquireVar();

        body.push(
            resVar, '= [];',
            i, '= 0;',
            len, '=', ctx, '.length;',
            'while(', i, '<', len, ') {',
                curItem, '=', ctx, '[', i, '++];');
                translateExpr(expr.arg, cond, curItem);
        body.push(
                convertToBool(expr.arg, cond), '&&', resVar, '.push(', curItem, ');',
            '}',
            dest, '=', resVar, ';');

        releaseVars(resVar, i, len, curItem, cond);
    }

    function translatePosPredicate(item, dest, ctx) {
        var arrayExpr = item.arg, fromIdx, toIdx;
        if(arrayExpr.idx) {
            var idx = acquireVar();
            translateExpr(arrayExpr.idx, idx, ctx);
            body.push(
                idx, '< 0 && (', idx, '=', ctx, '.length +', idx, ');',
                dest, '=', ctx, '[', idx, '] == null? [] : [', ctx, '[', idx, ']];');
            releaseVars(idx);
            return false;
        }
        else if(arrayExpr.fromIdx) {
            if(arrayExpr.toIdx) {
                translateExpr(arrayExpr.fromIdx, fromIdx = acquireVar(), ctx);
                translateExpr(arrayExpr.toIdx, toIdx = acquireVar(), ctx);
                body.push(dest, '=', ctx, '.slice(', fromIdx, ',', toIdx, ');');
                releaseVars(fromIdx, toIdx);
            }
            else {
                translateExpr(arrayExpr.fromIdx, fromIdx = acquireVar(), ctx);
                body.push(dest, '=', ctx, '.slice(', fromIdx, ');');
                releaseVars(fromIdx);
            }
        }
        else {
            translateExpr(arrayExpr.toIdx, toIdx = acquireVar(), ctx);
            body.push(dest, '=', ctx, '.slice(0,', toIdx, ');');
            releaseVars(toIdx);
        }
    }

    function translateExpr(expr, dest, ctx) {
        switch(expr.type) {
            case SYNTAX.PATH:
                translatePath(expr, dest, ctx);
                break;

            case SYNTAX.CONCAT_EXPR:
                translateConcatExpr(expr, dest, ctx);
                break;

            case SYNTAX.COMPARISON_EXPR:
                translateComparisonExpr(expr, dest, ctx);
                break;

            case SYNTAX.MATH_EXPR:
                translateMathExpr(expr, dest, ctx);
                break;

            case SYNTAX.LOGICAL_EXPR:
                translateLogicalExpr(expr, dest, ctx);
                break;

            case SYNTAX.UNARY_EXPR:
                translateUnaryExpr(expr, dest, ctx);
                break;

            case SYNTAX.LITERAL:
                var val = expr.val;
                body.push(dest, '=', typeof val === 'string'? escapeStr(val) : val, ';');
                break;
        }
    }

    function translateComparisonExpr(expr, dest, ctx) {
        var val1 = acquireVar(), val2 = acquireVar(),
            isVal1Array = acquireVar(), isVal2Array = acquireVar(),
            i = acquireVar(), j = acquireVar(),
            len1 = acquireVar(), len2 = acquireVar(),
            leftArg = expr.args[0], rightArg = expr.args[1];

        body.push(dest, '= false;');

        translateExpr(leftArg, val1, ctx);
        translateExpr(rightArg, val2, ctx);

        var isLeftArgPath = leftArg.type === SYNTAX.PATH,
            isRightArgLiteral = rightArg.type === SYNTAX.LITERAL;

        body.push(isVal1Array, '=');
        isLeftArgPath? body.push('true;') : body.push('isArr(', val1, ');');

        body.push(isVal2Array, '=');
        isRightArgLiteral? body.push('false;') : body.push('isArr(', val2, ');');

        body.push(
            'if(');
        isLeftArgPath || body.push(isVal1Array, '&&');
        body.push(val1, '.length === 1) {',
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

    function translateLogicalExpr(expr, dest, ctx) {
        var conditionVars = [],
            args = expr.args, len = args.length,
            i = 0, val;

        body.push(dest, '= false;');
        switch(expr.op) {
            case '&&':
                while(i < len) {
                    conditionVars.push(val = acquireVar());
                    translateExpr(args[i], val, ctx);
                    body.push('if(', convertToBool(args[i++], val), ') {');
                }
                body.push(dest, '= true;');
                break;

            case '||':
                while(i < len) {
                    conditionVars.push(val = acquireVar());
                    translateExpr(args[i], val, ctx);
                    body.push(
                        'if(', convertToBool(args[i], val), ') {',
                            dest, '= true;',
                        '}');
                    if(i++ + 1 < len) {
                        body.push('else {');
                    }
                }
                --len;
                break;
        }

        while(len--) {
            body.push('}');
        }

        releaseVars.apply(null, conditionVars);
    }

    function translateMathExpr(expr, dest, ctx) {
        var val1 = acquireVar(),
            val2 = acquireVar(),
            args = expr.args;

        translateExpr(args[0], val1, ctx);
        translateExpr(args[1], val2, ctx);

        body.push(
            dest, '=',
            binaryOperators[expr.op](
                convertToSingleValue(args[0], val1),
                convertToSingleValue(args[1], val2)),
            ';');

        releaseVars(val1, val2);
    }

    function translateUnaryExpr(expr, dest, ctx) {
        var val = acquireVar(),
            arg = expr.arg;

        translateExpr(arg, val, ctx);

        switch(expr.op) {
            case '!':
                body.push(dest, '= !', convertToBool(arg, val) + ';');
                break;

            case '-':
                body.push(dest, '= -', convertToSingleValue(arg, val) + ';');
                break;
        }

        releaseVars(val);
    }

    function translateConcatExpr(expr, dest, ctx) {
        var argVars = [],
            args = expr.args,
            len = args.length,
            i = 0;

        while(i < len) {
            argVars.push(acquireVar());
            translateExpr(args[i], argVars[i++], ctx);
        }

        body.push(dest, '= concat.call(', argVars.join(','), ');');

        releaseVars.apply(null, argVars);
    }

    function escapeStr(s) {
        return '\'' + s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'') + '\'';
    }

    function inlineAppendToArray(res, val, tmpArr, len) {
        body.push(
            'if(', val, '!= null) {',
                'if(isArr(', val, ')) {');
        if(tmpArr) {
            body.push(
                    len, '> 1?');
                        inlinePushToArray(tmpArr, val);
            body.push(
                        ':');
        }
        body.push(
                    res, '=', res, '.length?', res, '.concat(', val, ') :', val, '.slice()', ';',
                '}',
                'else {');
        tmpArr && body.push(
                    'if(', tmpArr, '.length) {',
                        res, '= concat.apply(', res, ',', tmpArr, ');',
                        tmpArr, '= [];',
                    '}');
                    inlinePushToArray(res, val);
        body.push(';',
                '}',
            '}');
    }

    function inlinePushToArray(res, val) {
        body.push(res, '.length?', res, '.push(', val, ') :',  res, '[0] =', val);
    }

    function convertToBool(arg, varName) {
        switch(arg.type) {
            case SYNTAX.LOGICAL_EXPR:
                return varName;

            case SYNTAX.LITERAL:
                return '!!' + varName;

            case SYNTAX.PATH:
                return varName + '.length > 0';

            default:
                return ['(typeof ', varName, '=== "boolean"?',
                    varName, ':',
                    'isArr(', varName, ')?', varName, '.length > 0 : !!', varName, ')'].join('');
        }
    }

    function convertToSingleValue(arg, varName) {
        switch(arg.type) {
            case SYNTAX.LITERAL:
                return varName;

            case SYNTAX.PATH:
                return varName + '[0]';

            default:
                return ['(isArr(', varName, ')?', varName, '[0] : ', varName, ')'].join('');
        }
    }

    var binaryOperators = {
            '===' : function(val1, val2) {
                return val1 + '===' + val2;
            },

            '==' : function(val1, val2) {
                return ['typeof ', val1, '=== "string" && typeof ', val2, '=== "string"?',
                    val1, '.toLowerCase() ===', val2, '.toLowerCase() :' +
                    val1, '==', val2].join('');
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
                return ['typeof ', val1, '=== "string" && typeof ', val2, '=== "string" &&',
                    val1, '.indexOf(', val2, ') === 0'].join('');
            },

            '^=' : function(val1, val2) {
                return [val1, '!= null &&', val2, '!= null &&',
                    val1, '.toString().toLowerCase().indexOf(', val2, '.toString().toLowerCase()) === 0'].join('');
            },

            '$==' : function(val1, val2) {
                return ['typeof ', val1, '=== "string" && typeof ', val2, '=== "string" &&',
                    val1, '.length >=', val2, '.length &&',
                    val1, '.lastIndexOf(', val2, ') ===', val1, '.length -', val2, '.length'].join('');
            },

            '$=' : function(val1, val2) {
                return [val1, '!= null &&', val2, '!= null &&',
                    '(', val1, '=', val1, '.toString()).length >=', '(', val2, '=', val2, '.toString()).length &&',
                    '(', val1, '.toLowerCase()).lastIndexOf(', '(', val2, '.toLowerCase())) ===',
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
        };

    return translate;
})();

function compile(path) {
    return Function('data,subst', translate(parse(path)));
}

var cache = {},
    cacheKeys = [],
    params = {
        cacheSize : 100
    },
    setParamsHooks = {
        cacheSize : function(oldVal, newVal) {
            if(newVal < oldVal && cacheKeys.length > newVal) {
                var removedKeys = cacheKeys.splice(0, cacheKeys.length - newVal),
                    i = removedKeys.length;

                while(i--) {
                    delete cache[removedKeys[i]];
                }
            }
        }
    };

var decl = function(path, ctx, substs) {
    if(!cache[path]) {
        cache[path] = compile(path);
        if(cacheKeys.push(path) > params.cacheSize) {
            delete cache[cacheKeys.shift()];
        }
    }

    return cache[path](ctx, substs || {});
};

decl.version = '0.3.4';

decl.params = function(_params) {
    if(!arguments.length) {
        return params;
    }

    for(var name in _params) {
        if(_params.hasOwnProperty(name)) {
            setParamsHooks[name] && setParamsHooks[name](params[name], _params[name]);
            params[name] = _params[name];
        }
    }
};

decl.compile = compile;

decl.apply = decl;

if(typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = decl;
}
else if(typeof modules === 'object') {
    modules.define('jspath', function(provide) {
        provide(decl);
    });
}
else if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = decl;
    });
}
else {
    JSPath = decl;
}

})();
