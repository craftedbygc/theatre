import * as path from 'path'
import {build} from 'esbuild'
import type {BuildOptions} from 'esbuild'

const definedGlobals = {}

async function createBundles() {
  const pathToPackage = path.join(__dirname, '../')
  const esbuildConfig: BuildOptions = {
    entryPoints: [path.join(pathToPackage, 'src/index.ts')],
    bundle: true,
    sourcemap: true,
    define: definedGlobals,
    platform: 'neutral',
    mainFields: ['browser', 'module', 'main'],
    target: 'es2020',
    conditions: ['browser', 'node'],
  }

  await Promise.all([
    build({
      ...esbuildConfig,
      outfile: path.join(pathToPackage, 'dist/index.js'),
      format: 'cjs',
    }),
    build({
      ...esbuildConfig,
      outfile: path.join(pathToPackage, 'dist/index.mjs'),
      format: 'esm',
    }),
  ])
}

void createBundles()
