import * as t from 'babel-types';
import CONSTANTS from './constants';

export function createRequireStatement(varName: string, requireDir: string): t.VariableDeclaration {
    return t.variableDeclaration(
        'var',
        [t.variableDeclarator(
            t.identifier(varName),
            t.callExpression(
                t.identifier(CONSTANTS.COMMONJS_REQUIRE),
                [t.stringLiteral(requireDir)],
            ),
        )],
    );
}

export function createInjectedNejParamDeclaration(varName: string): t.VariableDeclaration {
    return t.variableDeclaration(
        'var',
        [t.variableDeclarator(
            t.identifier(varName),
            t.objectExpression([]),
        )],
    );
}

export function createExportStatement(exportedExpression: t.Expression): t.ExpressionStatement {
    return t.expressionStatement(
        t.assignmentExpression(
            '=',
            t.memberExpression(
                t.identifier('module'),
                t.identifier('exports'),
            ),
            exportedExpression,
        ),
    );
}