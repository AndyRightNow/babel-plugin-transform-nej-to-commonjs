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
            CallExpression: function (path) {
                var node = path.node;
                var callee = node.callee;
                var isNejDefine = t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object) &&
                    callee.object.name === constants_1["default"].OBJECT_NAME &&
                    t.isIdentifier(callee.property) &&
                    callee.property.name === constants_1["default"].DEFINE_NAME;
                var isDefine = t.isIdentifier(callee) &&
                    callee.name === constants_1["default"].DEFINE_NAME;
                if (isNejDefine ||
                    isDefine) {
                    var functionDefinition_1;
                    var functionDefinitionVar_1;
                    var dependencyList_1 = [];
                    _.forEach(node.arguments, function (arg) {
                        if (t.isArrayExpression(arg)) {
                            dependencyList_1 = _.map(arg.elements, function (el) {
                                t.assertStringLiteral(el);
                                return el.value;
                            });
                        }
                        else if (t.isFunctionExpression(arg)) {
                            functionDefinition_1 = arg;
                        }
                        else if (t.isIdentifier(arg)) {
                            functionDefinitionVar_1 = arg;
                        }
                    });
                    if (!functionDefinition_1) {
                        if (functionDefinitionVar_1 &&
                            path.scope.hasBinding(functionDefinitionVar_1.name)) {
                            babel_traverse_1["default"](path.scope.block, {
                                VariableDeclarator: function (vdPath) {
                                    var vdNode = vdPath.node;
                                    if (t.isIdentifier(vdNode.id) &&
                                        functionDefinitionVar_1 &&
                                        vdNode.id.name === functionDefinitionVar_1.name &&
                                        t.isFunctionExpression(vdNode.init)) {
                                        functionDefinition_1 = vdNode.init;
                                        vdPath.stop();
                                        return;
                                    }
                                }
                            });
                        }
                        else {
                            throw new Error('Invalid NEJ function definition');
                        }
                    }
                    if (!functionDefinition_1) {
                        throw new Error('Invalid NEJ function definition');
                    }
                    var dependencyVarNameList_1 = _.map(functionDefinition_1.params, function (p) { return p.name; });
                    var exportedExp = t.objectExpression([]);
                    var lastStmtOfFunctionBody = _.last(functionDefinition_1.body.body);
                    var functionBody = functionDefinition_1.body.body;
                    if (!lastStmtOfFunctionBody) {
                        throw new Error('Invalid NEJ function definition');
                    }
                    if (dependencyVarNameList_1.length > dependencyList_1.length &&
                        !t.isReturnStatement(lastStmtOfFunctionBody)) {
                        exportedExp = functionDefinition_1.params[dependencyList_1.length];
                    }
                    else if (t.isReturnStatement(lastStmtOfFunctionBody)) {
                        exportedExp = lastStmtOfFunctionBody.argument;
                        functionBody = _.slice(functionBody, 0, functionBody.length - 1);
                    }
                    var commonjsAst = t.program(_.map(dependencyList_1, function (dep, index) {
                        return helpers_1.createRequireStatement(dependencyVarNameList_1[index], dep);
                    }).concat(_.map(_.slice(dependencyVarNameList_1, dependencyList_1.length), function (varName) {
                        return helpers_1.createInjectedNejParamDeclaration(varName);
                    }), functionDefinition_1.body.body, [
                        helpers_1.createExportStatement(exportedExp),
                    ]));
                    programPath.replaceWith(commonjsAst);
                    path.stop();
                }
            }
        }
    };
}
exports["default"] = default_1;
//# sourceMappingURL=index.js.map