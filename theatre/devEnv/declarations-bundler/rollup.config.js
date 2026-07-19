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
    external: (s) => {
      if (
        s === '@unseenco/theatre-dataverse' ||
        s.startsWith(
          `@unseenco/theatre-${which === 'studio' ? 'core' : 'studio'}`,
        )
      ) {
        return true
      }

      if (s.startsWith('@unseenco/theatre')) {
        return false
      }

      if (s.startsWith('/') || s.startsWith('./') || s.startsWith('../')) {
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
    ],
  }
})

export default config
