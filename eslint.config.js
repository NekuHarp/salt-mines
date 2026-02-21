import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import js from "@eslint/js";
import nodePlugin from "eslint-plugin-n";
import pluginSecurity from "eslint-plugin-security";

export default [
    js.configs.recommended,
    nodePlugin.configs["flat/recommended-module"],
    pluginSecurity.configs.recommended,
    eslintConfigPrettier,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: { ...globals.node },
        },
        rules: {
            "sort-imports": "warn",
            "no-implicit-coercion": "error",
            "no-unused-vars": ["error", { argsIgnorePattern: "next" }],
            "n/no-extraneous-import": "error",
        },
    },
];
