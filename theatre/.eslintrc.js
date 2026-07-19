const path = require('path')

module.exports = {
  rules: {
    'no-relative-imports': [
      'warn',
      {
        aliases: [
          {
            name: '@unseenco/theatre-core',
            path: path.resolve(__dirname, './core/src'),
          },
          {
            name: '@unseenco/theatre-shared',
            path: path.resolve(__dirname, './shared/src'),
          },
          {
            name: '@unseenco/theatre-studio',
            path: path.resolve(__dirname, './studio/src'),
          },
        ],
      },
    ],
  },
}
