"use strict";
exports.__esModule = true;
var t = require("babel-types");
var constants_1 = require("./constants");
var lodash_1 = require("lodash");
function createRequireStatement(varName, requireDir) {
    return t.variableDeclaration('var', [
        t.variableDeclarator(t.identifier(varName), t.callExpression(t.identifier(constants_1["default"].COMMONJS_REQUIRE), [t.stringLiteral(requireDir)])),
    ]);
}
exports.createRequireStatement = createRequireStatement;
function createInjectedNejParamDeclaration(varName) {
    return t.variableDeclaration('var', [t.variableDeclarator(t.identifier(varName), t.arrowFunctionExpression([], t.blockStatement([])))]);
}
exports.createInjectedNejParamDeclaration = createInjectedNejParamDeclaration;
function createExportStatement(exportedExpression) {
    return t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.identifier('module'), t.identifier('exports')), exportedExpression));
}
exports.createExportStatement = createExportStatement;
function createCommentBlock(value) {
    return {
        type: 'CommentBlock',
        value: value,
        start: 0,
        end: value.length,
        loc: {
            start: {
                line: 0,
                column: 0
            },
            end: {
                line: 0,
                column: value.length
            }
        }
    };
}
exports.createCommentBlock = createCommentBlock;
function transformDependencyWithNejAliases(dependencyDir, nejAliases) {
    if (!nejAliases) {
        return dependencyDir;
    }
    lodash_1.forOwn(nejAliases, function (mappedPath, alias) {
        var aliasRE = new RegExp("({" + alias + "})|(^" + alias + ")(?:[\\/]+)");
        dependencyDir = dependencyDir.replace(/^(.*?)\!/, '').replace(aliasRE, function (matched, p1, p2) {
            if (p1) {
                return matched.replace(p1, mappedPath);
            }
            else if (p2) {
                return matched.replace(p2, mappedPath);
            }
            else {
                return matched;
            }
        });
    });
    return dependencyDir.replace(/[\/\\]+/g, '/');
}
exports.transformDependencyWithNejAliases = transformDependencyWithNejAliases;
function transformArrowFunctionToFunction(arrowFunction) {
    var functionBody;
    if (t.isFunctionExpression(arrowFunction)) {
        return arrowFunction;
    }
    if (t.isExpression(arrowFunction.body)) {
        functionBody = t.blockStatement([t.returnStatement(arrowFunction.body)]);
    }
    else {
        functionBody = arrowFunction.body;
    }
    return t.functionExpression(undefined, arrowFunction.params, functionBody);
}
exports.transformArrowFunctionToFunction = transformArrowFunctionToFunction;
//# sourceMappingURL=helpers.js.map