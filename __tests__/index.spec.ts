/* tslint:disable */
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
                    injected2
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

            expect(code).toEqual(
                `var something = require('./something.js');

var somethingElse = require('text!./somethingelse.html');

var withAlias = require('pro/with/alias');

var withOtherAlias = require('{pro}/with/other/alias.js');

var injected1 = {};
var injected2 = {};

var exported = {
    something: something,
    somethingElse: somethingElse,
    withAlias: withAlias,
    withOtherAlias: withOtherAlias
};

module.exports = exported;`,
            );
        });
    });
});