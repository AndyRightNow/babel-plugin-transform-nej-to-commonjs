"use strict";
exports.__esModule = true;
var index_1 = require("./../src/index");
var babel = require("babel-core");
describe('babel-plugin-transform-nej-to-commonjs-plugin tests', function () {
    describe('Exec tests', function () {
        it('should be ok with NEJ.define with ananymous function definition and returned export', function () {
            var source = "\n                NEJ.define([\n                    './something.js',\n                    'text!./somethingelse.html'\n                ], function (\n                    something,\n                    somethingElse,\n                ) {\n                    var exported = {\n                        something: something,\n                        somethingElse: somethingElse\n                    };\n\n                    return exported;\n                });\n            ";
            var code = babel.transform(source, {
                plugins: [
                    index_1["default"],
                ]
            }).code;
            console.log(code);
        });
    });
});
//# sourceMappingURL=index.spec.js.map