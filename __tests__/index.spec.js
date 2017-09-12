"use strict";
exports.__esModule = true;
var index_1 = require("./../src/index");
var babel = require("babel-core");
describe('babel-plugin-transform-nej-to-commonjs-plugin tests', function () {
    describe('Exec tests', function () {
        it('should be ok with NEJ.define with ananymous function definition and returned export', function () {
            var source = "\n                NEJ.define([\n                    './something.js',\n                    'text!./somethingelse.html',\n                    'pro/with/alias',\n                    '{pro}/with/other/alias.js'\n                ],  (\n                    something,\n                    somethingElse,\n                    withAlias,\n                    withOtherAlias,\n                    injected1,\n                    injected2\n                ) => {\n                    var exported = {\n                        something: something,\n                        somethingElse: somethingElse,\n                        withAlias: withAlias,\n                        withOtherAlias: withOtherAlias\n                    };\n\n                    return exported;\n                });\n            ";
            var code = babel.transform(source, {
                plugins: [
                    index_1["default"],
                ]
            }).code;
            expect(code).toEqual("/* global NEJ */\nvar something = require('./something.js');\n\nvar somethingElse = require('text!./somethingelse.html');\n\nvar withAlias = require('pro/with/alias');\n\nvar withOtherAlias = require('{pro}/with/other/alias.js');\n\nvar injected1 = {};\nvar injected2 = {};\n\nvar exported = {\n    something: something,\n    somethingElse: somethingElse,\n    withAlias: withAlias,\n    withOtherAlias: withOtherAlias\n};\n\nmodule.exports = exported;");
        });
        it('should be ok with define, variable function definition and injected export ', function () {
            var source = "\n                var f = function (\n                    something,\n                    somethingElse,\n                    withAlias,\n                    withOtherAlias,\n                    exports,\n                    injected1\n                ) {\n                    exports.exported = {\n                        something: something,\n                        somethingElse: somethingElse,\n                        withAlias: withAlias,\n                        withOtherAlias: withOtherAlias\n                    };\n                };\n\n                NEJ.define([\n                    './something.js',\n                    'text!./somethingelse.html',\n                    'pro/with/alias',\n                    '{pro}/with/other/alias.js'\n                ], f);\n            ";
            var code = babel.transform(source, {
                plugins: [
                    index_1["default"],
                ]
            }).code;
            expect(code).toEqual("/* global NEJ */\nvar something = require('./something.js');\n\nvar somethingElse = require('text!./somethingelse.html');\n\nvar withAlias = require('pro/with/alias');\n\nvar withOtherAlias = require('{pro}/with/other/alias.js');\n\nvar exports = {};\nvar injected1 = {};\n\nexports.exported = {\n    something: something,\n    somethingElse: somethingElse,\n    withAlias: withAlias,\n    withOtherAlias: withOtherAlias\n};\nmodule.exports = exports;");
        });
        it('should be ok with define, variable function definition and no dependencies ', function () {
            var source = "\n                var f = function (\n                    exports,\n                    injected1\n                ) {\n                    exports.exported = {\n                        something: 1\n                    };\n                };\n\n                NEJ.define([], f);\n            ";
            var code = babel.transform(source, {
                plugins: [
                    index_1["default"],
                ]
            }).code;
            expect(code).toEqual("/* global NEJ */var exports = {};\nvar injected1 = {};\n\nexports.exported = {\n    something: 1\n};\nmodule.exports = exports;");
        });
        it('should be ok with define, standalone variable function definition and no dependencies ', function () {
            var source = "\n                var f;\n\n                f =  (\n                    exports,\n                    injected1\n                ) => {\n                    exports.exported = {\n                        something: 1\n                    };\n                };\n\n                NEJ.define([], f);\n            ";
            var code = babel.transform(source, {
                plugins: [
                    index_1["default"],
                ]
            }).code;
            expect(code).toEqual("/* global NEJ */var exports = {};\nvar injected1 = {};\n\nexports.exported = {\n    something: 1\n};\nmodule.exports = exports;");
        });
    });
});
//# sourceMappingURL=index.spec.js.map