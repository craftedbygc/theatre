module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: `ImportDeclaration[importKind!='type'][source.value=/@unseenco\\u002Ftheatre-studio/]`,
        message:
          '@unseenco/theatre-core may not import @unseenco/theatre-studio modules except via type imports.',
      },
    ],
  },
}
