# @unseenco/theatre

A fork of [Theatre.js](https://github.com/theatre-js/theatre), maintained internally by Unseen Studio.

Theatre.js is a motion-design library for the web: you define animations in code and refine them in a visual editor (Studio). This fork publishes under the `@unseenco` npm scope (e.g. `@unseenco/theatre-core`, `@unseenco/theatre-studio`).

For the original project, docs, and community, see [theatrejs.com](https://www.theatrejs.com).

## Packages

| Package | Description |
| --- | --- |
| `@unseenco/theatre-core` | Runtime animation library (ships in production bundles) |
| `@unseenco/theatre-studio` | Visual editor (dev-time only) |
| `@unseenco/theatre-dataverse` | Reactive dataflow library used internally |
| `@unseenco/theatre-react` | React bindings |
| `@unseenco/theatre-browser-bundles` | Pre-built browser bundles |

## Development

```bash
yarn                  # install dependencies
yarn cli build        # build all packages
yarn typecheck        # typecheck
yarn test             # unit tests
yarn playground       # local dev playground (Vite)
```

See [AGENTS.md](./AGENTS.md) and [CONTRIBUTING.md](./CONTRIBUTING.md) for more detail.

## Release

Publishing is done via the release CLI (requires a clean git tree and npm access to the `unseenco` org):

```bash
yarn cli release x.y.z
```

## License

This fork inherits the upstream licenses:

- `@unseenco/theatre-core` and most packages: **Apache-2.0**
- `@unseenco/theatre-studio`: **AGPL-3.0** (editor only; not included in production bundles)

Original copyright notices are preserved in each package's `LICENSE` file.
