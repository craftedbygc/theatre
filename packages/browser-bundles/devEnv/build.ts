import * as path from 'path'
import {build} from 'esbuild'
import type {BuildOptions} from 'esbuild'

const definedGlobals = {
  global: 'window',
  'process.env.THEATRE_VERSION': JSON.stringify(
    require('../package.json').version,
  ),
}

async function createBundles() {
  const pathToPackage = path.join(__dirname, '../')
  const esbuildConfig: BuildOptions = {
    bundle: true,
    sourcemap: true,
    define: definedGlobals,
    platform: 'browser',
    loader: {
      '.png': 'dataurl',
      '.glb': 'dataurl',
      '.gltf': 'dataurl',
      '.svg': 'dataurl',
    },
    mainFields: ['browser', 'module', 'main'],
    target: 'es2020',
    conditions: ['browser', 'node'],
  }

  await Promise.all([
    build({
      ...esbuildConfig,
      entryPoints: [path.join(pathToPackage, 'src/core-and-studio.ts')],
      outfile: path.join(pathToPackage, 'dist/core-and-studio.js'),
      format: 'iife',
    }),
    build({
      ...esbuildConfig,
      entryPoints: [path.join(pathToPackage, 'src/core-only.ts')],
      outfile: path.join(pathToPackage, 'dist/core-only.min.js'),
      minify: true,
      format: 'iife',
      define: {
        ...definedGlobals,
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
    }),
  ])
}

void createBundles()
