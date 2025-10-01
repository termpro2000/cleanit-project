module.exports = {
  root: true,
  extends: ['universe/native', 'plugin:prettier/recommended'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        tabWidth: 2,
        semi: true,
        trailingComma: 'es5',
      },
    ],
  },
};
