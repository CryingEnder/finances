/* eslint-disable unicorn/prefer-import-meta-properties */

/**
 * The official ESLint configuration for Go To Next Level
 *
 * @see https://eslint.style
 * @see https://perfectionist.dev
 */

import path from "path";

import { fileURLToPath } from "url";

import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import nodePlugin from "eslint-plugin-n";
import promise from "eslint-plugin-promise";
import unicorn from "eslint-plugin-unicorn";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import importPlugin from "eslint-plugin-import";
import stylistic from "@stylistic/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";
import query from "@tanstack/eslint-plugin-query";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import graphql from "@graphql-eslint/eslint-plugin";
import perfectionist from "eslint-plugin-perfectionist";

import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";
import {
  parser as TSESLintParser,
  configs as TSESLintConfigs,
} from "typescript-eslint";

// import css from '@eslint/css'; <- Disabled for now, StyleLint is used instead for the CSS/SCSS files.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default defineConfig([
  {
    plugins: {
      "@next/next": nextPlugin,
    },
  },
  globalIgnores([
    ".vscode",
    "CHANGELOG.md",
    "package.json",
    "package-lock.json",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    processor: graphql.processor,
  },
  {
    files: ["**/*.graphql"],
    languageOptions: {
      parser: graphql.parser,
    },
    plugins: {
      "@graphql-eslint": graphql,
    },
    extends: [graphql.configs["flat/operations-recommended"]],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      parser: TSESLintParser,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      promise,
      n: nodePlugin,
    },
    /**
     * https://github.com/standard/eslint-config-standard
     *
     * Included only the rules that are not already included in the ESLint recommended config.
     */
    rules: {
      "no-var": "warn",
      "object-shorthand": "error",
      "accessor-pairs": "error",
      curly: ["error", "multi-line"], // Disabled by the Prettier config
      "default-case-last": "error",
      "dot-notation": "error",
      eqeqeq: "error",
      "new-cap": [
        "error",
        {
          capIsNew: false,
        },
      ],
      "no-array-constructor": "error",
      "no-caller": "error",
      "no-eval": "error",
      "no-extend-native": "error",
      "no-extra-bind": "error",
      "no-implied-eval": "error",
      "no-iterator": "error",
      "no-labels": "error",
      "no-lone-blocks": "error",
      "no-multi-str": "error",
      "no-new": "error",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "no-octal-escape": "error",
      "no-proto": "error",
      "no-return-assign": "error",
      "no-self-compare": "error",
      "no-sequences": "error",
      "no-template-curly-in-string": "error",
      "no-throw-literal": "error",
      "no-undef-init": "error",
      "no-unmodified-loop-condition": "error",
      "no-unneeded-ternary": [
        "error",
        {
          defaultAssignment: false,
        },
      ],
      "no-unreachable-loop": "error",
      "no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
          enforceForJSX: true,
        },
      ],
      "no-useless-call": "error",
      "no-useless-computed-key": "error",
      "no-useless-constructor": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "no-void": "error",
      "one-var": [
        "error",
        {
          initialized: "never",
        },
      ],
      "prefer-const": [
        "error",
        {
          destructuring: "all",
        },
      ],
      "prefer-promise-reject-errors": "error",
      "prefer-regex-literals": [
        "error",
        {
          disallowRedundantWrapping: true,
        },
      ],
      "symbol-description": "error",
      "unicode-bom": "error",
      "import/export": "error",
      "import/first": "error",
      "import/no-absolute-path": "error",
      "import/no-duplicates": "error",
      "import/no-named-default": "error",
      "import/no-webpack-loader-syntax": "error",
      "n/handle-callback-err": ["error", "^.*(e|E)rr"],
      "n/no-callback-literal": "error",
      "n/no-deprecated-api": "error",
      "n/no-exports-assign": "error",
      "n/no-new-require": "error",
      "n/no-path-concat": "error",
      "n/process-exit-as-throw": "error",
      "promise/param-names": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      js,
      unicorn,
      perfectionist,
    },
    settings: {
      react: {
        version: "detect",
      },
      linkComponents: ["Link", "ExternalLinkQSP"],
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        }, // https://www.npmjs.com/package/eslint-import-resolver-typescript
        node: true, // https://www.npmjs.com/package/eslint-import-resolver-node
      },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
    },
    extends: [
      "js/recommended",
      stylistic.configs.recommended,
      TSESLintConfigs.recommended,
      TSESLintConfigs.stylistic,
      compat.extends("plugin:@next/next/core-web-vitals"),
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat["jsx-runtime"],
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      jsxA11y.flatConfigs.recommended,
      query.configs["flat/recommended"],
      reactHooks.configs.recommended,
      prettier, // The ESLint Prettier Config should be the last in the extends array! (Do not CHANGE)
    ],
    rules: {
      /**
       * https://github.com/standard/eslint-config-standard
       *
       * Adjusted the next 6 rules to be exactly as the Standard config rules.
       */
      "use-isnan": [
        "error",
        {
          enforceForIndexOf: true,
          enforceForSwitchCase: true,
        },
      ],
      "valid-typeof": [
        "error",
        {
          requireStringLiterals: true,
        },
      ],
      "no-redeclare": [
        "error",
        {
          builtinGlobals: false,
        },
      ],
      "no-empty": [
        "error",
        {
          allowEmptyCatch: false,
        },
      ],
      "no-constant-condition": [
        "error",
        {
          checkLoops: "allExceptWhileTrue",
        },
      ],
      "no-self-assign": [
        "error",
        {
          props: true,
        },
      ],

      "no-lonely-if": "error",
      "no-warning-comments": "off",
      "no-implicit-coercion": [
        "error",
        {
          allow: ["!!"],
        },
      ],
      "array-callback-return": [
        "error",
        {
          allowVoid: true,
          checkForEach: true,
          allowImplicit: true,
        },
      ],

      "unicorn/prefer-prototype-methods": "error",
      "unicorn/prefer-default-parameters": "error",
      "unicorn/prefer-optional-catch-binding": "error",
      "unicorn/prefer-native-coercion-functions": "error",
      "unicorn/prefer-logical-operator-over-ternary": "error",

      // v57.0.0
      "unicorn/no-named-default": "error",
      "unicorn/consistent-assert": "error",
      "unicorn/no-accessor-recursion": "error",
      "unicorn/consistent-date-clone": "error",
      "unicorn/no-instanceof-builtins": "error",

      // v59.0.0
      "unicorn/prefer-import-meta-properties": "error",
      "unicorn/no-unnecessary-array-flat-depth": "error",
      "unicorn/no-unnecessary-array-splice-count": "error",

      "unicorn/escape-case": "error",
      "unicorn/no-lonely-if": "error",
      "unicorn/error-message": "error",
      "unicorn/no-useless-spread": "error",
      "unicorn/no-zero-fractions": "error",
      "unicorn/number-literal-case": "error",
      "unicorn/no-useless-undefined": "error",
      "unicorn/no-unnecessary-await": "error",
      "unicorn/expiring-todo-comments": [
        "error",
        {
          allowWarningComments: true,
        },
      ],
      "unicorn/no-unnecessary-slice-end": "error", // As of v59.0.0
      "unicorn/consistent-function-scoping": "error",
      "unicorn/no-await-in-promise-methods": "error",
      "unicorn/no-useless-fallback-in-spread": "error",
      "unicorn/consistent-empty-array-spread": "error",
      "unicorn/no-invalid-remove-event-listener": "error",
      "unicorn/no-useless-promise-resolve-reject": "error",
      "unicorn/no-single-promise-in-promise-methods": "error",

      // "react-hooks/rules-of-hooks" & "react/no-unstable-nested-components" are disabled because we use the React Compiler -> https://github.com/reactwg/react-compiler/discussions/18

      "react-hooks/react-compiler": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      "react/button-has-type": "error",
      "react/jsx-boolean-value": "error",
      "react/self-closing-comp": "error",
      "react/jsx-wrap-multilines": "error",
      "react/no-did-mount-set-state": "error",
      "react/jsx-no-useless-fragment": "error",
      "react/no-did-update-set-state": "error",
      "react/no-unstable-nested-components": "off",
      "react/no-unknown-property": [
        "error",
        {
          ignore: ["jsx", "global"],
        },
      ],
      "react/jsx-curly-brace-presence": [
        "error",
        {
          props: "never",
          children: "never",
          propElementValues: "always",
        },
      ],

      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",

      camelcase: "off",
      "@typescript-eslint/naming-convention": [
        "error",
        { format: null, selector: "typeMethod" },
        { format: null, selector: "typeProperty" },
        { format: null, selector: "objectLiteralMethod" },
        { format: null, selector: "objectLiteralProperty" },
        {
          selector: "default",
          leadingUnderscore: "allowSingleOrDouble",
          trailingUnderscore: "allowSingleOrDouble",
          format: ["snake_case", "camelCase", "PascalCase", "UPPER_CASE"],
        },
      ],

      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["default"],
              message:
                "Do not import React directly, use the import deconstruction syntax instead. import { ... } from 'react' or import type { ... } from 'react'",
            },
          ],
        },
      ],

      yoda: [
        "error",
        "always",
        {
          onlyEquality: true,
        },
      ],

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          caughtErrors: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      /**
       * @see https://perfectionist.dev/rules/sort-jsx-props
       */
      "perfectionist/sort-jsx-props": [
        "error",
        {
          type: "line-length",
          order: "asc",
          fallbackSort: {
            type: "alphabetical",
            order: "asc",
          },
        },
      ],

      /**
       * @see https://perfectionist.dev/rules/sort-named-imports
       */
      "perfectionist/sort-named-imports": [
        "error",
        {
          type: "line-length",
          order: "asc",
          fallbackSort: {
            type: "alphabetical",
            order: "asc",
          },
        },
      ],

      /**
       * @see https://perfectionist.dev/rules/sort-named-exports
       */
      "perfectionist/sort-named-exports": [
        "error",
        {
          type: "line-length",
          order: "asc",
          fallbackSort: {
            type: "alphabetical",
            order: "asc",
          },
        },
      ],

      /**
       * @see https://perfectionist.dev/rules/sort-imports
       */
      "perfectionist/sort-imports": [
        "error",
        {
          type: "line-length",
          order: "asc",
          fallbackSort: {
            type: "alphabetical",
            order: "asc",
          },
          internalPattern: ["^@/.*"],
          groups: [
            "side-effect-style",
            "side-effect",

            "type-default-style",
            "type-named-style",
            ["default-style", "wildcard-style"],
            "named-style",
            "style",

            "type-default-subpath",
            "type-named-subpath",
            ["default-subpath", "wildcard-subpath"],
            "named-subpath",
            "subpath",

            "type-default-builtin",
            "type-named-builtin",
            ["default-builtin", "wildcard-builtin"],
            "named-builtin",
            "builtin",

            "type-default-external",
            "type-named-external",
            ["default-external", "wildcard-external"],
            "named-external",
            "external",

            "type-default-parent",
            "type-named-parent",
            ["default-parent", "wildcard-parent"],
            "named-parent",
            "parent",

            "type-default-index",
            "type-named-index",
            ["default-index", "wildcard-index"],
            "named-index",
            "index",

            "type-default-sibling",
            "type-named-sibling",
            ["default-sibling", "wildcard-sibling"],
            "named-sibling",
            "sibling",

            "type-default-internal",
            "type-named-internal",
            ["default-internal", "wildcard-internal"],
            "named-internal",
            "internal",

            "type-default-import",
            "type-named-import",
            ["default-import", "wildcard-import"],
            "named-import",
            "import",

            "unknown",
          ],
        },
      ],

      // 'import/order': [
      //     'error',
      //     {
      //         distinctGroup: true,
      //         'newlines-between': 'always',
      //         warnOnUnassignedImports: true,
      //         pathGroupsExcludedImportTypes: ['type'],
      //         pathGroups: [
      //             { group: 'unknown', position: 'after', pattern: '@/**' },
      //             { group: 'unknown', position: 'after', pattern: '@fonts/**' },
      //             { group: 'unknown', position: 'after', pattern: '@images/**' },
      //             { group: 'unknown', position: 'after', pattern: '@styles/**' },
      //             { group: 'unknown', position: 'after', pattern: '@clients/**' },
      //         ],
      //         alphabetize: {
      //             order: 'asc',
      //             orderImportKind: 'asc',
      //             caseInsensitive: true,
      //         },
      //         groups: [
      //             'type',
      //             'builtin',
      //             'external',
      //             'internal',
      //             'unknown',
      //             'parent',
      //             'sibling',
      //             'index',
      //             'object',
      //         ],
      //     },
      // ],
    },
  },
  {
    files: ["**/index.{js,ts}"],
    plugins: {
      perfectionist,
    },
    rules: {
      /**
       * @see https://perfectionist.dev/rules/sort-exports
       */
      "perfectionist/sort-exports": [
        "error",
        {
          type: "line-length",
          order: "asc",
          fallbackSort: {
            type: "alphabetical",
            order: "asc",
          },
          groups: ["type-export", "export", "unknown"],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "no-return-await": "off",
      "@typescript-eslint/return-await": ["error", "always"],
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": [
        "error",
        {
          classes: false,
          functions: false,
          variables: false,

          enums: false,
          typedefs: false,
          ignoreTypeReferences: true,
        },
      ],
      "no-void": [
        "error",
        {
          allowAsStatement: true,
        },
      ],
      "no-var": "off", // https://github.com/eslint/eslint/issues/15896
      "no-restricted-syntax": [
        "error",
        {
          message: "Unexpected var, use let or const instead.",
          selector: "VariableDeclaration[kind='var'][declare!=true]",
        },
      ],
      "@typescript-eslint/no-this-alias": [
        "error",
        {
          allowedNames: ["self"],
          allowDestructuring: true,
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off", // Not compatible with the React compiler
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
    },
    extends: [
      TSESLintConfigs.strictTypeChecked,
      TSESLintConfigs.stylisticTypeChecked,
    ],
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "no-restricted-syntax": "off", // https://github.com/eslint/eslint/issues/15896
    },
  },
  // {
  //     files: ['**/*.css'],
  //     plugins: {
  //         css,
  //     },
  //     language: 'css/css',
  //     extends: ['css/recommended'],
  // },
  {
    files: ["**/*.json"],
    plugins: {
      json,
    },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.jsonc"],
    plugins: {
      json,
    },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.json5"],
    plugins: {
      json,
    },
    language: "json/json5",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.md"],
    plugins: {
      markdown,
    },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },
]);
