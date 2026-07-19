# AGENTS.md

Concise agent-facing notes for the Theatre.js monorepo. Read `CONTRIBUTING.md` for the human-facing version.

## Toolchain

- **Yarn 3.2** (via `.yarnrc.yml`, `nodeLinker: node-modules`) pinned through `packageManager`. `npm install` won't work — use `yarn`. One install step: `yarn`. TypeScript pinned to `5.1.6` (do not bump — multi-project solution build depends on it).
- Node 14+ required locally; CI runs on Node 18.
- No separate build/lint/test runner config — orchestration lives in `devEnv/cli.ts` (run via `yarn cli <cmd>`).

## Essential commands (run from repo root)

| Task | Command |
| --- | --- |
| Install | `yarn` (also runs `husky install` via `postinstall`) |
| Build all packages | `yarn cli build` |
| Clean build artifacts | `yarn cli build clean` |
| Typecheck all projects | `yarn typecheck` → `tsc --build devEnv/typecheck-all-projects/tsconfig.all.json` |
| Lint (CI mode) | `yarn lint:all --max-warnings 0` (lint needs `NODE_OPTIONS=--max_old_space_size=4096` in CI) |
| Lint autofix | `yarn lint:all --fix` |
| Unit/integration tests | `yarn test` (`--watch` supported) |
| Single test file | `yarn test path/to/file.test.ts` |
| E2E tests (playwright) | `yarn test:e2e` (headed) or `yarn test:e2e:ci` (chromium, dot reporter) |
| Compat tests | `yarn test:compat:install` then `yarn test:compat:run` (two-step; install runs a local verdaccio) |
| Dev playground | `yarn playground` (= `yarn workspace playground run serve`, Vite, rebuilds packages on the fly) |
| Release | `yarn cli release x.y.z[-dev|rc.w]` (maintainers only; needs clean git tree) |

CI order (`.github/workflows/ci.yml`): `Build`, `Lint`, `Test`, `Typecheck`, `VisualRegression`, `Compatibility-Tests` — all run in parallel jobs. A passing PR must satisfy all six.

## Architecture / package boundaries

Yarn workspaces: `packages/*`, `examples/*`, `theatre`, `compat-tests`. Lerna is configured (`lerna.json`) but versions are managed manually; **all packages share one version number** (set in root `package.json` and bumped by the release CLI).

Published packages → source location:
- `@unseenco/theatre-core` → `theatre/core/` — runtime animation library (Apache-2.0, ships in user bundles)
- `@unseenco/theatre-studio` → `theatre/studio/` — visual editor (AGPL-3.0, dev-time only)
- `@unseenco/theatre-dataverse` → `packages/dataverse/` — reactive dataflow
- `@unseenco/theatre-react` → `packages/react/`
- `@unseenco/theatre-browser-bundles` → `packages/browser-bundles/`

Non-published: `packages/playground` (dev harness + e2e), `packages/saaz`, `packages/dataverse-experiments`, `packages/utils`, `packages/app`, `theatre/shared`, `theatre/devEnv`, `compat-tests`.

TypeScript path aliases (`tsconfig.base.json`) map `@unseenco/theatre-*` directly to `src/index.ts` of each package — imports resolve to source, not `dist`. Jest uses the same aliases (see `devEnv/getAliasesFromTsConfig.ts`). Don't add relative cross-package imports; use the `@unseenco/theatre-*` aliases.

## Build / codegen quirks

- `yarn cli build` runs TypeScript solution build AND each package's own `build` script in parallel. A package's `build` typically emits dist via esbuild (`devEnv/build.ts` per package) plus `api-extractor` for the public API surface. `@unseenco/theatre-dataverse` also runs `build:api-json`.
- `examples/*` consume built `dist/` output — you MUST `yarn cli build` before running any example (`cd examples/<name> && yarn start`). The `playground` is the exception: it rebuilds packages live via Vite.
- Types are emitted with `declarationMap`; consumers in the monorepo still resolve to source via path aliases.

## Testing quirks

- Jest config picks up `packages/*/src/**/*.test.ts`, `theatre/*/src/**/*.test.ts`, `devEnv/**/*.test.ts`. Compat tests use a **separate** config (`jest.compat-tests.config.js`) — `yarn test` will not run them.
- `moduleNameMapper` rewrites ES-module-only deps (`uuid`, `nanoid`, `lodash-es`, `react-use/esm`, css/svg/png) — if a test fails on a missing ESM export, add the mapping here rather than changing the import.
- `setupFiles: theatre/shared/src/setupTestEnv.ts` is loaded for every unit test.
- E2E (playwright) tests live in `packages/playground/src/tests/<name>/*.e2e.ts`. Run from the playground workspace, not root: `cd packages/playground && yarn test`. Filter with `--project=firefox`, `--headed`, `--debug` (inspector). Use `yarn playwright codegen http://localhost:8080/tests/<name>` after `yarn serve`.
- **Visual regression** only runs in CI (Linux VM). To reproduce locally use `docker-compose up -d` then `docker-compose exec -it node bash` → `yarn && yarn test:e2e:ci`. If you can't use Docker, ask maintainers to update screenshots.
- **Compat tests** are two-phase for a reason: `test:compat:install` spins up verdaccio, publishes a real build, and runs `npm install` in each `fixtures/*/package`. If install fails, the cause is almost always an unsatisfiable `dependency`/`peerDependency` on a `@unseenco/theatre-*` package — fix that first, not the fixture. Some bundlers (notably CRA's webpack) walk `node_modules` up into the monorepo and break; symptoms often disappear outside the monorepo.

## Pre-commit hook gotchas

`.husky/pre-commit` runs:
1. `yarn lint-staged` — eslint `--fix` on `(theatre|packages|devEnv|compat-tests)/**/*.(t|j)s?(x)`, prettier on all `(t|j)s?(x)`.
2. `yarn workspace @unseenco/theatre-dataverse run precommit` — regenerates `packages/dataverse/docs` via typedoc.
3. Fails if `packages/dataverse/docs` has uncommitted changes — so any edit to dataverse's public API must come with regenerated docs in the same commit. Run `yarn workspace @unseenco/theatre-dataverse run doc` if you edit dataverse source.

## Release flow (do not run unless asked)

`yarn cli release x.y.z` (see `devEnv/cli.ts`):
- Valid version shapes: `x.y.z`, `x.y.z-dev.w`, `x.y.z-rc.w`, `x.y.z-beta.w` (regex-enforced).
- Requires a clean git tree; sets `THEATRE_IS_PUBLISHING=1` so packages' `prepublish` guards pass.
- Bumps versions in all `packagesWhoseVersionsShouldBump` (root + each package JSON), builds, commits + tags with the version string, then `npm publish --access public --tag <latest|dev|rc|beta>`.

## Workflow conventions

- Squash-and-merge preferred for PRs unless history matters (then rebase). Always rebase feature branch onto `main` before merging.
- Core contributors branch from `main` as `feature/<id>`, `hotfix/<id>`, or `docs/<id>` (or the autogenerated GitHub issue branch).
- VSCode task "Typescript watch" runs `yarn typecheck --watch`.
- `packages/playground/src/personal/**` is gitignored — use it for throwaway experiments; `src/shared/<name>/index.tsx` is the committed playground pattern. Every playground needs `index.tsx`.

## Cursor Cloud specific instructions

- Standard commands are in the tables above; the update script only runs `yarn` (install) on startup. Build/lint/test/run are not run automatically — run them yourself as needed.
- Node 22 is installed here and works for the full flow (`yarn cli build`, `yarn typecheck`, `yarn lint:all`, `yarn test`) even though `CONTRIBUTING.md` mentions Node 14+/CI 18.
- Running the app: `yarn playground` (Vite). It auto-selects a free port and does NOT always use 8080 — read the "Local:" URL it prints (it came up on `http://localhost:8082/` here). Demo pages route as `/<group>/<module>/`, e.g. `/shared/dom/` loads the Studio editor controlling a DOM element.
