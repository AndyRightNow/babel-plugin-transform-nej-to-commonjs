import { default as transformNejToCommonjsPlugin } from './../src/index';
import * as babel from 'babel-core';

describe('babel-plugin-transform-nej-to-commonjs-plugin tests', () => {
    describe('Exec tests', () => {
        it('should be ok with NEJ.define with ananymous function definition and returned export', () => {
            let source = `
                NEJ.define([
                    './something.js',
                    'text!./somethingelse.html',
                    'pro/with/alias',
                    '{pro}/with/other/alias.js'
                ], function (
                    something,
                    somethingElse,
                    withAlias,
                    withOtherAlias,
                    injected1,
                    injected2,
                    injected3,
                    injected4
                ) {
                    var exported = {
                        something: something,
                        somethingElse: somethingElse,
                        withAlias: withAlias,
                        withOtherAlias: withOtherAlias
                    };

                    return exported;
                });
            `;

            let {
                code
            } = babel.transform(
                source, {
                    plugins: [
                        transformNejToCommonjsPlugin,
                    ],
                },
            );

            console.log(code);
        });
    });
});