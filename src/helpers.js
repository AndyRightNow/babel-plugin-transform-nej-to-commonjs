"use strict";
exports.__esModule = true;
var t = require("babel-types");
var constants_1 = require("./constants");
function createRequireStatement(varName, requireDir) {
    return t.variableDeclaration('var', [t.variableDeclarator(t.identifier(varName), t.callExpression(t.identifier(constants_1["default"].COMMONJS_REQUIRE), [t.stringLiteral(requireDir)]))]);
}
exports.createRequireStatement = createRequireStatement;
function createInjectedNejParamDeclaration(varName) {
    return t.variableDeclaration('var', [t.variableDeclarator(t.identifier(varName), t.objectExpression([]))]);
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
//# sourceMappingURL=helpers.js.map