<p align="left">
    <a target="_blank" href="https://www.npmjs.com/package/babel-plugin-transform-nej-to-commonjs">
        <img src="https://img.shields.io/npm/v/babel-plugin-transform-nej-to-commonjs.svg" alt="Version">
    </a>
</p>

# babel-plugin-transform-nej-to-commonjs

Transform code using NEJ module system to CommonJS module system.

# Usage

## In `.babelrc` (Recommended)

`.babelrc`:
```json
{
    "plugins": [
        ["transform-nej-to-commonjs", {
            "nejPathAliases": {
                "pro": "src/"
            }
        }]
    ]
}
```

For more information on **NEJ path aliases**, see [the documentation of NEJ](https://github.com/genify/nej).

# Options

**Name:** `nejPathAliases`

**Type:** `Object`

**Description:** Mapped NEJ path aliases. Will be replaced by the values given after transformation.

