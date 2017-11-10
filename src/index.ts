import * as _ from 'lodash';
import * as babel from 'babel-core';
import * as t from 'babel-types';

import { NodePath, Binding } from 'babel-traverse';

import CONSTANTS from './constants';
import {
    createRequireStatement,
    createInjectedNejParamDeclaration,
    createExportStatement,
    createCommentBlock,
    transformDependencyWithNejAliases,
    transformArrowFunctionToFunction,
    isFunction,
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
                        } else if (isFunction(arg)) {
                            functionDefinition = transformArrowFunctionToFunction(arg);
                        } else if (t.isIdentifier(arg)) {
                            functionDefinitionVar = arg;
                        }
                    });

                    if (!functionDefinition) {
                        if (functionDefinitionVar) {
                            let binding: Binding | undefined;

                            if (path.scope.parent &&
                                path.scope.parent.hasBinding(functionDefinitionVar.name)) {
                                binding = path.scope.parent.getBinding(functionDefinitionVar.name);
                            } else {
                                binding = path.scope.getBinding(functionDefinitionVar.name);
                            }

                            if (binding) {
                                const bindingPath = binding.path;
                                let fnDef: t.FunctionExpression | t.ArrowFunctionExpression | undefined;

                                if (bindingPath.parentKey === 'params' && t.isFunctionExpression(bindingPath.parent)) {
                                    const argPos = _.findIndex(
                                        bindingPath.parent.params,
                                        param => param === bindingPath.node,
                                    );
                                    const firstCallExpParent = bindingPath.findParent(p => t.isCallExpression(p));
                                    fnDef = (firstCallExpParent && t.isCallExpression(firstCallExpParent.node)
                                        ? firstCallExpParent.node.arguments[argPos]
                                        : firstCallExpParent.node) as typeof fnDef;
                                } else if (
                                    t.isVariableDeclarator(bindingPath.node) &&
                                    isFunction(bindingPath.node.init)
                                ) {
                                    fnDef = bindingPath.node.init;
                                } else {
                                    for (const refPath of binding.referencePaths) {
                                        if (t.isAssignmentExpression(refPath.parent) &&
                                            isFunction(refPath.parent.right)) {
                                            fnDef = refPath.parent.right;
                                        }
                                    }
                                }

                                if (fnDef && isFunction(fnDef)) {
                                    functionDefinition = transformArrowFunctionToFunction(fnDef);
                                }
                            }
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
                        ..._.map(_.slice(dependencyVarNameList, dependencyList.length), (varName, index) => {
                            return createInjectedNejParamDeclaration(varName, index);
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
