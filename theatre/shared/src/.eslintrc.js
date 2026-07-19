module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: `ImportDeclaration[importKind!='type'][source.value=/@unseenco\\u002Ftheatre-(core|studio)/]`,
        message:
          '@unseenco/theatre-shared may not import @unseenco/theatre-core or @unseenco/theatre-studio modules except via type imports.',
      },
    ],
  },
}
