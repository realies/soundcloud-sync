import { FlatCompat } from '@eslint/eslintrc';
import * as tseslint from 'typescript-eslint';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  {
    ignores: ['**/node_modules/**'],
  },
  ...compat.extends('airbnb-base', 'plugin:import/errors', 'plugin:prettier/recommended'),
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      curly: 'error',
      'arrow-parens': ['error', 'as-needed', { requireForBlockBody: false }],
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'key-spacing': ['error', { mode: 'minimum' }],
      'no-unneeded-ternary': 'error',
      'no-unused-expressions': ['error', { allowShortCircuit: true }],
      'no-use-before-define': ['error', 'nofunc'],
      'prettier/prettier': 'error',
      'import/no-unresolved': 0,
      'import/no-named-as-default': 0,
      'no-trailing-spaces': 'error',
      'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
      'no-console': 'off',
      camelcase: 'off',
      'no-control-regex': 'off',
      'import/extensions': [
        'error',
        'always',
        {
          js: 'never',
          ts: 'never',
        },
      ],
    },
  },
];
