import path from 'path'
import * as esbuild from 'esbuild'
import {definedGlobals} from './definedGlobals'

export async function createBundles(watch: boolean) {
  for (const which of ['core', 'studio']) {
    const pathToPackage = path.join(__dirname, '../', which)
    const esbuildConfig: Parameters<typeof esbuild.context>[0] = {
      entryPoints: [path.join(pathToPackage, 'src/index.ts')],
      target: 'es2020',
      loader: {'.png': 'file', '.svg': 'dataurl'},
      bundle: true,
      sourcemap: true,
      supported: {
        // 'unicode-escapes': false,
        'template-literal': false,
      },
      define: {
        ...definedGlobals,
        __IS_VISUAL_REGRESSION_TESTING: 'false',
      },
      external: [
        '@unseenco/theatre-dataverse',
        /**
         * Prevents double-bundling react.
         *
         * @remarks
         * Ideally we'd want to just bundle our own fixed version of react to keep things
         * simple, but for now we keep react external because we're exposing these
         * react-dependant API from \@unseenco/theatre-studio:
         *
         * - `ToolbarIconButton`
         * - `IStudio['extend']({globalToolbar: {component}})`
         *
         * It's probably possible to bundle our own react version and somehow share it
         * with the plugins, but that's not urgent atm.
         */
        // 'react',
        // 'react-dom',
        // 'styled-components',
      ],
    }

    if (which === 'core') {
      esbuildConfig.platform = 'neutral'
      esbuildConfig.mainFields = ['browser', 'module', 'main']
      esbuildConfig.conditions = ['browser', 'node']
    } else {
      esbuildConfig.define!['process.env.NODE_ENV'] =
        JSON.stringify('production')

      esbuildConfig.minify = true
    }

    const outputs: Array<{outfile: string; format: 'cjs' | 'esm'}> = [
      {outfile: path.join(pathToPackage, 'dist/index.js'), format: 'cjs'},
      {outfile: path.join(pathToPackage, 'dist/index.mjs'), format: 'esm'},
    ]

    for (const {outfile, format} of outputs) {
      const ctx = await esbuild.context({
        ...esbuildConfig,
        outfile,
        format,
      })

      if (watch) {
        await ctx.watch()
      } else {
        await ctx.rebuild()
        await ctx.dispose()
      }
    }
  }
}
