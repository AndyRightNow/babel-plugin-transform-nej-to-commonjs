import * as _ from 'lodash';
import * as babel from 'babel-core';
import * as t from 'babel-types';

import { NodePath, default as traverse } from 'babel-traverse';

import CONSTANTS from './constants';
import {
    createRequireStatement,
    createInjectedNejParamDeclaration,
    createExportStatement,
    createCommentBlock,
    transformDependencyWithNejAliases,
    transformArrowFunctionToFunction,
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
            CallExpression(path: NodePath, state: { opts: IPluginOptions }) {
                const pluginOptions = state.opts;
                const node = path.node as t.CallExpression;
                const callee = node.callee;
                const isNejDefine =
                    t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object) &&
                    callee.object.name === CONSTANTS.OBJECT_NAME &&
                    t.isIdentifier(callee.property) &&
                    callee.property.name === CONSTANTS.DEFINE_NAME;
                const isDefine = t.isIdentifier(callee) && callee.name === CONSTANTS.DEFINE_NAME;

                // Get NEJ module function definition
                if (isNejDefine || isDefine) {
                    let functionDefinition: t.FunctionExpression | undefined;
                    let functionDefinitionVar: t.Identifier | undefined;
                    const dependencyList: string[] = [];

                    _.forEach(node.arguments, arg => {
                        if (t.isArrayExpression(arg)) {
                            for (const el of arg.elements) {
                                if (t.isStringLiteral(el)) {
                                    dependencyList.push(
                                        transformDependencyWithNejAliases(el.value, pluginOptions.nejPathAliases),
                                    );
                                }
                            }
                        } else if (t.isFunctionExpression(arg) || t.isArrowFunctionExpression(arg)) {
                            functionDefinition = transformArrowFunctionToFunction(arg);
                        } else if (t.isIdentifier(arg)) {
                            functionDefinitionVar = arg;
                        }
                    });

                    if (!functionDefinition) {
                        if (functionDefinitionVar && path.scope.hasBinding(functionDefinitionVar.name)) {
                            traverse(path.scope.block, {
                                'VariableDeclarator|AssignmentExpression|Identifier': (vaiPath: NodePath) => {
                                    const vaiNode = vaiPath.node as
                                        | t.VariableDeclarator
                                        | t.AssignmentExpression
                                        | t.Identifier;
                                    let left: t.LVal | undefined;
                                    let right: t.Expression | undefined;

                                    if (t.isVariableDeclarator(vaiNode)) {
                                        left = vaiNode.id;
                                        right = vaiNode.init;
                                    } else if (t.isAssignmentExpression(vaiNode)) {
                                        left = vaiNode.left;
                                        right = vaiNode.right;
                                    } else {
                                        if (functionDefinitionVar &&
                                            vaiNode.name === functionDefinitionVar.name &&
                                            t.isFunctionExpression(vaiPath.parent)) {
                                            let argPos = 1;
                                            for (let i = 0, l = vaiPath.parent.params.length; i < l; i++) {
                                                const param = vaiPath.parent.params[i];

                                                if (t.isIdentifier(param) &&
                                                    param.name === functionDefinitionVar.name) {
                                                    argPos = i;
                                                    break;
                                                }
                                            }
                                            const callExp = vaiPath.scope.parent.parentBlock;
                                            if (t.isCallExpression(callExp)) {
                                                const fn = callExp.arguments[argPos];
                                                if (t.isFunctionExpression(fn)) {
                                                    functionDefinition = fn;
                                                }
                                            }
                                        }
                                    }

                                    if (left && right &&
                                        t.isIdentifier(left) &&
                                        functionDefinitionVar &&
                                        left.name === functionDefinitionVar.name &&
                                        (t.isFunctionExpression(right) || t.isArrowFunctionExpression(right))
                                    ) {
                                        functionDefinition = transformArrowFunctionToFunction(right);
                                        vaiPath.stop();
                                        return;
                                    }
                                },
                            } as any, path.scope);
                        } else {
                            path.stop();
                            return;
                        }
                    }

                    if (!functionDefinition) {
                        path.stop();
                        return;
                    }

                    // Get exported statement
                    const dependencyVarNameList = _.map(
                        functionDefinition.params,
                        p => (t.isIdentifier(p) && p.name) || '',
                    );
                    let exportedExp: t.Identifier | t.Expression = t.objectExpression([]);
                    let functionBody = functionDefinition.body.body;
                    const lastStmtOfFunctionBody = _.last(functionBody);

                    if (lastStmtOfFunctionBody) {
                        if (
                            dependencyVarNameList.length > dependencyList.length &&
                            !t.isReturnStatement(lastStmtOfFunctionBody)
                        ) {
                            exportedExp = (functionDefinition.params as t.Identifier[])[dependencyList.length];
                        } else if (t.isReturnStatement(lastStmtOfFunctionBody)) {
                            exportedExp = lastStmtOfFunctionBody.argument;
                            functionBody = _.slice(functionBody, 0, functionBody.length - 1);
                        }
                    }

                    const requireStatements = _.map(
                        _.slice(dependencyList, 0, dependencyVarNameList.length),
                        (dep, index) => {
                            return createRequireStatement(dependencyVarNameList[index], dep);
                        },
                    );

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
                        ..._.map(_.slice(dependencyVarNameList, dependencyList.length), varName => {
                            return createInjectedNejParamDeclaration(varName);
                        }),
                        ...functionBody,
                        createExportStatement(exportedExp),
                    ]);

                    commonjsAst.leadingComments = [createCommentBlock(CONSTANTS.ESLINT_GLOBAL_NEJ)];
                    programPath.replaceWith(commonjsAst);
                    path.stop();
                }
            },
        },
    };
}
