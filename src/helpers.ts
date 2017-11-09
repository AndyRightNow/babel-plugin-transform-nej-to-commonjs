import * as t from 'babel-types';
import CONSTANTS from './constants';
import { forOwn } from 'lodash';

export function createRequireStatement(varName: string, requireDir: string): t.VariableDeclaration {
    return t.variableDeclaration('var', [
        t.variableDeclarator(
            t.identifier(varName),
            t.callExpression(t.identifier(CONSTANTS.COMMONJS_REQUIRE), [t.stringLiteral(requireDir)]),
        ),
    ]);
}

export function createInjectedNejParamDeclaration(varName: string): t.VariableDeclaration {
    return t.variableDeclaration('var', [t.variableDeclarator(t.identifier(varName), t.objectExpression([]))]);
}

export function createExportStatement(exportedExpression: t.Expression): t.ExpressionStatement {
    return t.expressionStatement(
        t.assignmentExpression(
            '=',
            t.memberExpression(t.identifier('module'), t.identifier('exports')),
            exportedExpression,
        ),
    );
}

export function createCommentBlock(value: string): t.CommentBlock {
    return {
        type: 'CommentBlock',
        value,
        start: 0,
        end: value.length,
        loc: {
            start: {
                line: 0,
                column: 0,
            },
            end: {
                line: 0,
                column: value.length,
            },
        },
    };
}

export function transformDependencyWithNejAliases(
    dependencyDir: string,
    nejAliases?: { [alias: string]: string },
): string {
    if (!nejAliases) {
        return dependencyDir;
    }

    forOwn(nejAliases, (mappedPath: string, alias: string) => {
        const aliasRE = new RegExp(`(\{${alias}\})|(^${alias})(?:[\\\/]+)`);

        dependencyDir = dependencyDir.replace(aliasRE, (matched: string, p1: string, p2: string) => {
            if (p1) {
                return matched.replace(p1, mappedPath);
            } else if (p2) {
                return matched.replace(p2, mappedPath);
            } else {
                return matched;
            }
        });
    });

    return dependencyDir.replace(/[\/\\]+/g, '/');
}

export function transformArrowFunctionToFunction(
    arrowFunction: t.ArrowFunctionExpression | t.FunctionExpression,
): t.FunctionExpression {
    let functionBody: t.BlockStatement;

    if (t.isFunctionExpression(arrowFunction)) {
        return arrowFunction;
    }

    if (t.isExpression(arrowFunction.body)) {
        functionBody = t.blockStatement([t.returnStatement(arrowFunction.body)]);
    } else {
        functionBody = arrowFunction.body;
    }

    return t.functionExpression(undefined, arrowFunction.params, functionBody);
}
