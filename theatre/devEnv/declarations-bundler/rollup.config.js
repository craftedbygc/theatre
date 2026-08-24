import alias from '@rollup/plugin-alias'
import path from 'path'
import dts from 'rollup-plugin-dts'

const fromPrivatePackage = (s) => path.join(__dirname, '../..', s)

const config = ['studio', 'core'].map((which) => {
  const fromPackage = (s) => path.join(fromPrivatePackage(`${which}`), s)

  return {
    input: {
      [which]: fromPrivatePackage(`.temp/declarations/${which}/src/index.d.ts`),
    },
    output: {
      dir: fromPackage('dist'),
      entryFileNames: 'index.d.ts',
      format: 'es',
    },
    external: (id) => {
      if (
        id === '@unseenco/theatre-dataverse' ||
        id.startsWith(
          `@unseenco/theatre-${which === 'studio' ? 'core' : 'studio'}`,
        )
      ) {
        return true
      }

      if (id.startsWith('@unseenco/theatre')) {
        return false
      }

      // Keep local declaration files in the rollup. Rollup may pass either the
      // original specifier (`./coreExports`) or a resolved filesystem path.
      // Unix absolute paths start with `/`; Windows ones are like `C:\...` and
      // must be detected with `path.isAbsolute`, otherwise they are treated as
      // externals and the published `dist/index.d.ts` re-exports files that
      // are not shipped (so consumers see "has no exported member 'types'").
      if (id.startsWith('./') || id.startsWith('../') || path.isAbsolute(id)) {
        return false
      }

      return true
    },

    plugins: [
      dts({respectExternal: true}),
      alias({
        entries: [
          {
            find: `@unseenco/theatre-${which}`,
            replacement: fromPrivatePackage(`.temp/declarations/${which}/src`),
          },
          {
            find: '@unseenco/theatre-shared',
            replacement: fromPrivatePackage('.temp/declarations/shared/src'),
          },
        ],
      }),
      {
        name: 'assert-bundled-dts-exports',
        generateBundle(_options, bundle) {
          if (which !== 'core') return
          const chunk = Object.values(bundle).find(
            (file) => file.type === 'chunk' && file.fileName === 'index.d.ts',
          )
          if (!chunk || chunk.type !== 'chunk') {
            throw new Error(
              'Declarations bundler did not emit theatre/core/dist/index.d.ts',
            )
          }
          for (const exportName of [
            'types',
            'getProject',
            'createRafDriver',
            'setCoreRafDriver',
            'IRafDriver',
          ]) {
            if (!chunk.exports.includes(exportName)) {
              throw new Error(
                `Bundled @unseenco/theatre-core types are missing export '${exportName}'. ` +
                  `dist/index.d.ts must be a self-contained rollup, not re-exports of ./coreExports.`,
              )
            }
          }
        },
      },
    ],
  }
})

export default config
