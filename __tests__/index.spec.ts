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
                ],  (
                    something,
                    somethingElse,
                    withAlias,
                    withOtherAlias,
                    injected1,
                    injected2
                ) => {
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
                `/* global NEJ */
var something = require('./something.js');

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

        it('should be ok with define, variable function definition and injected export ', () => {
            let source = `
                var f = function (
                    something,
                    somethingElse,
                    withAlias,
                    withOtherAlias,
                    exports,
                    injected1
                ) {
                    exports.exported = {
                        something: something,
                        somethingElse: somethingElse,
                        withAlias: withAlias,
                        withOtherAlias: withOtherAlias
                    };
                };

                NEJ.define([
                    './something.js',
                    'text!./somethingelse.html',
                    'pro/with/alias',
                    '{pro}/with/other/alias.js'
                ], f);
            `;

            let {
                code
            } = babel.transform(
                    source, {
                        plugins: [
                            transformNejToCommonjsPlugin,
                        ]
                    },
                );

            expect(code).toEqual(
                `/* global NEJ */
var something = require('./something.js');

var somethingElse = require('text!./somethingelse.html');

var withAlias = require('pro/with/alias');

var withOtherAlias = require('{pro}/with/other/alias.js');

var exports = {};
var injected1 = {};

exports.exported = {
    something: something,
    somethingElse: somethingElse,
    withAlias: withAlias,
    withOtherAlias: withOtherAlias
};
module.exports = exports;`,
            );
        });
        
        it('should be ok with define, variable function definition and no dependencies ', () => {
            let source = `
                var f = function (
                    exports,
                    injected1
                ) {
                    exports.exported = {
                        something: 1
                    };
                };

                NEJ.define([], f);
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
                `/* global NEJ */var exports = {};
var injected1 = {};

exports.exported = {
    something: 1
};
module.exports = exports;`,
            );
        });
        
        it('should be ok with define, standalone variable function definition and no dependencies ', () => {
            let source = `
                var f;

                f =  (
                    exports,
                    injected1
                ) => {
                    exports.exported = {
                        something: 1
                    };
                };

                NEJ.define([], f);
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
                `/* global NEJ */var exports = {};
var injected1 = {};

exports.exported = {
    something: 1
};
module.exports = exports;`,
            );
        });
        
        it('should be ok with mixed define ', () => {
            let source = `
!function (name, definition) {
if (typeof module != 'undefined' && module.exports) module.exports = definition();
else if (typeof NEJ !== 'undefined' && NEJ.define) NEJ.define(['util/encode/md5'],definition);
else this[name] = definition()
}('objectUtil', function ( _md5) {
    return _md5;
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
                `/* global NEJ */
var _md5 = require('util/encode/md5');

module.exports = _md5;`,
            );
        });
    });
});