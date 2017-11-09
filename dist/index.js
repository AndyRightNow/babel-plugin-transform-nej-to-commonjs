"use strict";
exports.__esModule = true;
var _ = require("lodash");
var t = require("babel-types");
var babel_traverse_1 = require("babel-traverse");
var constants_1 = require("./constants");
var helpers_1 = require("./helpers");
function default_1() {
    var programPath;
    return {
        visitor: {
            Program: function (path) {
                programPath = path;
            },
            CallExpression: function (path, state) {
                var pluginOptions = state.opts;
                var node = path.node;
                var callee = node.callee;
                var isNejDefine = t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object) &&
                    callee.object.name === constants_1["default"].OBJECT_NAME &&
                    t.isIdentifier(callee.property) &&
                    callee.property.name === constants_1["default"].DEFINE_NAME;
                var isDefine = t.isIdentifier(callee) && callee.name === constants_1["default"].DEFINE_NAME;
                if (isNejDefine || isDefine) {
                    var functionDefinition_1;
                    var functionDefinitionVar_1;
                    var dependencyList_1 = [];
                    _.forEach(node.arguments, function (arg) {
                        if (t.isArrayExpression(arg)) {
                            for (var _i = 0, _a = arg.elements; _i < _a.length; _i++) {
                                var el = _a[_i];
                                if (t.isStringLiteral(el)) {
                                    dependencyList_1.push(helpers_1.transformDependencyWithNejAliases(el.value, pluginOptions.nejPathAliases));
                                }
                            }
                        }
                        else if (t.isFunctionExpression(arg) || t.isArrowFunctionExpression(arg)) {
                            functionDefinition_1 = helpers_1.transformArrowFunctionToFunction(arg);
                        }
                        else if (t.isIdentifier(arg)) {
                            functionDefinitionVar_1 = arg;
                        }
                    });
                    if (!functionDefinition_1) {
                        if (functionDefinitionVar_1 && path.scope.hasBinding(functionDefinitionVar_1.name)) {
                            babel_traverse_1["default"](path.scope.block, {
                                'VariableDeclarator|AssignmentExpression|Identifier': function (vaiPath) {
                                    var vaiNode = vaiPath.node;
                                    var left;
                                    var right;
                                    if (t.isVariableDeclarator(vaiNode)) {
                                        left = vaiNode.id;
                                        right = vaiNode.init;
                                    }
                                    else if (t.isAssignmentExpression(vaiNode)) {
                                        left = vaiNode.left;
                                        right = vaiNode.right;
                                    }
                                    else {
                                        if (functionDefinitionVar_1 &&
                                            vaiNode.name === functionDefinitionVar_1.name &&
                                            t.isFunctionExpression(vaiPath.parent)) {
                                            var argPos = 1;
                                            for (var i = 0, l = vaiPath.parent.params.length; i < l; i++) {
                                                var param = vaiPath.parent.params[i];
                                                if (t.isIdentifier(param) &&
                                                    param.name === functionDefinitionVar_1.name) {
                                                    argPos = i;
                                                    break;
                                                }
                                            }
                                            var callExp = vaiPath.scope.parent.parentBlock;
                                            if (t.isCallExpression(callExp)) {
                                                var fn = callExp.arguments[argPos];
                                                if (t.isFunctionExpression(fn)) {
                                                    functionDefinition_1 = fn;
                                                }
                                            }
                                        }
                                    }
                                    if (left && right &&
                                        t.isIdentifier(left) &&
                                        functionDefinitionVar_1 &&
                                        left.name === functionDefinitionVar_1.name &&
                                        (t.isFunctionExpression(right) || t.isArrowFunctionExpression(right))) {
                                        functionDefinition_1 = helpers_1.transformArrowFunctionToFunction(right);
                                        vaiPath.stop();
                                        return;
                                    }
                                }
                            }, path.scope);
                        }
                        else {
                            path.stop();
                            return;
                        }
                    }
                    if (!functionDefinition_1) {
                        path.stop();
                        return;
                    }
                    var dependencyVarNameList_1 = _.map(functionDefinition_1.params, function (p) { return (t.isIdentifier(p) && p.name) || ''; });
                    var exportedExp = t.objectExpression([]);
                    var functionBody = functionDefinition_1.body.body;
                    var lastStmtOfFunctionBody = _.last(functionBody);
                    if (lastStmtOfFunctionBody) {
                        if (dependencyVarNameList_1.length > dependencyList_1.length &&
                            !t.isReturnStatement(lastStmtOfFunctionBody)) {
                            exportedExp = functionDefinition_1.params[dependencyList_1.length];
                        }
                        else if (t.isReturnStatement(lastStmtOfFunctionBody)) {
                            exportedExp = lastStmtOfFunctionBody.argument;
                            functionBody = _.slice(functionBody, 0, functionBody.length - 1);
                        }
                    }
                    var requireStatements = _.map(_.slice(dependencyList_1, 0, dependencyVarNameList_1.length), function (dep, index) {
                        return helpers_1.createRequireStatement(dependencyVarNameList_1[index], dep);
                    });
                    for (var i = 0, l = requireStatements.length; i < l; i++) {
                        requireStatements[i].loc = {
                            start: {
                                line: i,
                                column: 0
                            },
                            end: {
                                line: i,
                                column: 0
                            }
                        };
                    }
                    var commonjsAst = t.program(requireStatements.concat(_.map(_.slice(dependencyVarNameList_1, dependencyList_1.length), function (varName) {
                        return helpers_1.createInjectedNejParamDeclaration(varName);
                    }), functionBody, [
                        helpers_1.createExportStatement(exportedExp),
                    ]));
                    commonjsAst.leadingComments = [helpers_1.createCommentBlock(constants_1["default"].ESLINT_GLOBAL_NEJ)];
                    programPath.replaceWith(commonjsAst);
                    path.stop();
                }
            }
        }
    };
}
exports["default"] = default_1;
//# sourceMappingURL=index.js.map