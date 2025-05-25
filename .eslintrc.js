module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint',
    ],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        'comma-dangle': 0,
        'no-underscore-dangle': 0,
        'no-param-reassign': 0,
        'no-return-assign': 0,
        camelcase: 0,
    }
  };