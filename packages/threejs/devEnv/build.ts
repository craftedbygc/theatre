import * as path from 'path'
import {build} from 'esbuild'
import type {BuildOptions, Plugin} from 'esbuild'

const externalPlugin = (patterns: RegExp[]): Plugin => {
  return {
    name: `external`,

    setup(build) {
      build.onResolve({filter: /.*/}, (args) => {
        if (args.kind === 'entry-point') return

        const external = patterns.some((p) => {
          return p.test(args.path)
        })

        if (external) {
          return {path: args.path, external: true}
        }
      })
    },
  }
}

const definedGlobals = {
  global: 'window',
}

async function createBundles() {
  const pathToPackage = path.join(__dirname, '../')
  const entries = [
    {entry: 'index.ts', outfileBase: 'index'},
    {entry: 'extension.ts', outfileBase: 'extension'},
  ] as const

  const esbuildConfig: BuildOptions = {
    bundle: true,
    sourcemap: true,
    define: definedGlobals,
    platform: 'neutral',
    mainFields: ['browser', 'module', 'main'],
    target: 'es2020',
    conditions: ['browser', 'node'],
    plugins: [externalPlugin([/^[\@a-zA-Z]+/])],
  }

  await Promise.all(
    entries.flatMap(({entry, outfileBase}) => [
      build({
        ...esbuildConfig,
        entryPoints: [path.join(pathToPackage, 'src', entry)],
        outfile: path.join(pathToPackage, 'dist', `${outfileBase}.js`),
        format: 'cjs',
      }),
      build({
        ...esbuildConfig,
        entryPoints: [path.join(pathToPackage, 'src', entry)],
        outfile: path.join(pathToPackage, 'dist', `${outfileBase}.mjs`),
        format: 'esm',
      }),
    ]),
  )
}

void createBundles()
