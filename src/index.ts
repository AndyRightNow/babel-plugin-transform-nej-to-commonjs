import * as babel from 'babel-core';
import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';
import CONSTANTS from './constants'
import * as _ from 'lodash'

export default function (): babel.PluginObj {
    return {
        visitor: {
            VariableDeclarator(path: NodePath) {
                let node = path.node as t.VariableDeclarator;

                if (t.isFunctionExpression(node.init)) {
                    
                }
            },
            CallExpression(path: NodePath) {
                let node = path.node as t.CallExpression;
                let callee = node.callee;

                if (t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object) &&
                    callee.object.name === CONSTANTS.OBJECT_NAME &&
                    t.isIdentifier(callee.property) &&
                    callee.property.name === CONSTANTS.DEFINE_NAME) {
                    let functionDefinition: t.FunctionExpression | undefined;
                    let functionDefinitionVar: t.Identifier | undefined;
                    let dependencyList: string[] = [];

                    _.forEach(node.arguments, (arg) => {
                        if (t.isArrayExpression(arg)) {
                            dependencyList = _.map(arg.elements, (el: t.StringLiteral) => {
                                t.assertStringLiteral(el);
                                return el.value;
                            });
                        }
                        else if (t.isFunctionExpression(arg)) {
                            functionDefinition = arg;
                        }
                        else if (t.isIdentifier(arg)) {
                            functionDefinitionVar = arg;
                        }
                    })

                    if (!functionDefinition) {
                        if (functionDefinitionVar &&
                            path.scope.hasBinding(functionDefinitionVar.name)) {
                        }
                        else {
                            throw new Error('Invalid NEJ function definition')
                        }
                    }
                }
                else if (t.isIdentifier(callee) &&
                    callee.name === CONSTANTS.DEFINE_NAME) {
                }
                else {
                    return;
                }
            }
        }
    }
}