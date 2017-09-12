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
    createCommentBlock,
    transformDependencyWithNejAliases,
} from './helpers';

interface IPluginOptions {
    nejPathAliases: {
        /**
         * E.g. 'pro': 'src/javascript/'
         */
        [alias: string]: string;
    };
}

export default function (): babel.PluginObj {
    let programPath: NodePath;

    return {
        visitor: {
            Program(path: NodePath) {
                programPath = path;
            },
            CallExpression(path: NodePath, state: { opts: IPluginOptions; }) {
                const pluginOptions = state.opts;
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
                                return transformDependencyWithNejAliases(el.value, pluginOptions.nejPathAliases);
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
                                'VariableDeclarator|AssignmentExpression': (vdaePath: NodePath) => {
                                    const vdaeNode = vdaePath.node as t.VariableDeclarator | t.AssignmentExpression;
                                    let left: t.LVal;
                                    let right: t.Expression;

                                    if (t.isVariableDeclarator(vdaeNode)) {
                                        left = vdaeNode.id;
                                        right = vdaeNode.init;
                                    } else {
                                        left = vdaeNode.left;
                                        right = vdaeNode.right;
                                    }

                                    if (t.isIdentifier(left) &&
                                        functionDefinitionVar &&
                                        left.name === functionDefinitionVar.name &&
                                        t.isFunctionExpression(right)) {
                                        functionDefinition = right;
                                        vdaePath.stop();
                                        return;
                                    }
                                },
                            } as any);
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

                    if (lastStmtOfFunctionBody) {
                        if (dependencyVarNameList.length > dependencyList.length &&
                            !t.isReturnStatement(lastStmtOfFunctionBody)) {
                            exportedExp = (functionDefinition.params as t.Identifier[])[dependencyList.length];
                        } else if (t.isReturnStatement(lastStmtOfFunctionBody)) {
                            exportedExp = lastStmtOfFunctionBody.argument;
                            functionBody = _.slice(functionBody, 0, functionBody.length - 1);
                        }
                    }

                    const requireStatements = _.map(_.slice(
                        dependencyList,
                        0,
                        dependencyVarNameList.length),
                        (dep, index) => {
                            return createRequireStatement(
                                dependencyVarNameList[index],
                                dep,
                            );
                        });

                    // Adjust lines
                    for (let i = 0, l = requireStatements.length; i < l; i++) {
                        requireStatements[i].loc = {
                            start: {
                                line: i,
                                column: 0,
                            },
                            end: {
                                line: i,
                                column: 0,
                            },
                        };
                    }

                    // Generate commonjs AST
                    const commonjsAst = t.program([
                        ...requireStatements,
                        ..._.map(_.slice(dependencyVarNameList, dependencyList.length), (varName) => {
                            return createInjectedNejParamDeclaration(varName);
                        }),
                        ...functionBody,
                        createExportStatement(exportedExp),
                    ],
                    );

                    commonjsAst.leadingComments = [createCommentBlock(CONSTANTS.ESLINT_GLOBAL_NEJ)];
                    programPath.replaceWith(commonjsAst);
                    path.stop();
                }
            },
        },
    };
}