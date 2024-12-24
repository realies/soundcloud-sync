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
      'key-spacing': ['error', { mode: 'minimum' }],
      'no-unneeded-ternary': 'error',
      'no-trailing-spaces': 'error',
      'prettier/prettier': 'error',
      'no-unused-expressions': ['error', { allowShortCircuit: true }],
      'no-use-before-define': ['error', 'nofunc'],
      'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
      'no-control-regex': 'off',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'import/no-unresolved': 'off',
      'import/no-named-as-default': 'off',
      'no-console': 'off',
      camelcase: 'off',
    },
  },
];
