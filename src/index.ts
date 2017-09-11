import * as _ from 'lodash';
import * as babel from 'babel-core';
import * as t from 'babel-types';

import {
    NodePath,
    default as traverse,
} from 'babel-traverse';

import CONSTANTS from './constants';
import {
    createRequireStatement,
    createInjectedNejParamDeclaration,
    createExportStatement,
} from './helpers';

export default function (): babel.PluginObj {
    let programPath: NodePath;

    return {
        visitor: {
            Program(path: NodePath) {
                programPath = path;
            },
            CallExpression(path: NodePath) {
                const node = path.node as t.CallExpression;
                const callee = node.callee;
                const isNejDefine = t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object) &&
                    callee.object.name === CONSTANTS.OBJECT_NAME &&
                    t.isIdentifier(callee.property) &&
                    callee.property.name === CONSTANTS.DEFINE_NAME;
                const isDefine = t.isIdentifier(callee) &&
                    callee.name === CONSTANTS.DEFINE_NAME;

                // Get NEJ module function definition
                if (isNejDefine ||
                    isDefine) {
                    let functionDefinition: t.FunctionExpression | undefined;
                    let functionDefinitionVar: t.Identifier | undefined;
                    let dependencyList: string[] = [];

                    _.forEach(node.arguments, (arg) => {
                        if (t.isArrayExpression(arg)) {
                            dependencyList = _.map(arg.elements, (el: t.StringLiteral) => {
                                t.assertStringLiteral(el);
                                return el.value;
                            });
                        } else if (t.isFunctionExpression(arg)) {
                            functionDefinition = arg;
                        } else if (t.isIdentifier(arg)) {
                            functionDefinitionVar = arg;
                        }
                    });

                    if (!functionDefinition) {
                        if (functionDefinitionVar &&
                            path.scope.hasBinding(functionDefinitionVar.name)) {
                            traverse(path.scope.block, {
                                VariableDeclarator(vdPath: NodePath) {
                                    const vdNode = vdPath.node as t.VariableDeclarator;

                                    if (t.isIdentifier(vdNode.id) &&
                                        functionDefinitionVar &&
                                        vdNode.id.name === functionDefinitionVar.name &&
                                        t.isFunctionExpression(vdNode.init)) {
                                        functionDefinition = vdNode.init;
                                        vdPath.stop();
                                        return;
                                    }
                                },
                            });
                        } else {
                            throw new Error('Invalid NEJ function definition');
                        }
                    }

                    if (!functionDefinition) {
                        throw new Error('Invalid NEJ function definition');
                    }

                    // Get exported statement
                    const dependencyVarNameList: string[] =
                        _.map(functionDefinition.params, (p: t.Identifier) => p.name);
                    let exportedExp: t.Identifier | t.Expression = t.objectExpression([]);
                    const lastStmtOfFunctionBody = _.last(functionDefinition.body.body);
                    let functionBody = functionDefinition.body.body;

                    if (!lastStmtOfFunctionBody) {
                        throw new Error('Invalid NEJ function definition');
                    }

                    if (dependencyVarNameList.length > dependencyList.length &&
                        !t.isReturnStatement(lastStmtOfFunctionBody)) {
                        exportedExp = (functionDefinition.params as t.Identifier[])[dependencyList.length];
                    } else if (t.isReturnStatement(lastStmtOfFunctionBody)) {
                        exportedExp = lastStmtOfFunctionBody.argument;
                        functionBody = _.slice(functionBody, 0, functionBody.length - 1);
                    }

                    // Generate commonjs AST
                    const commonjsAst = t.program([
                        ..._.map(_.slice(dependencyList, 0, dependencyVarNameList.length), (dep, index) => {
                            return createRequireStatement(
                                dependencyVarNameList[index],
                                dep,
                            );
                        }),
                        ..._.map(_.slice(dependencyVarNameList, dependencyList.length), (varName) => {
                            return createInjectedNejParamDeclaration(varName);
                        }),
                        ...functionBody,
                        createExportStatement(exportedExp),
                    ],
                    );

                    programPath.replaceWith(commonjsAst);
                    path.stop();
                }
            },
        },
    };
}