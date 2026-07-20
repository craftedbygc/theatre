import sade from 'sade'
import {$, fs, path} from '@cspotcode/zx'

if (process.platform === 'win32') {
  $.shell = 'cmd.exe'
  $.prefix = ''
}

const prog = sade('cli').describe('CLI for Theatre.js development')

// better quote function from https://github.com/google/zx/pull/167
$.quote = function quote(arg) {
  if (/^[a-z0-9@/_.-]+$/i.test(arg)) {
    return arg
  }
  return (
    `$'` +
    arg
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\f/g, '\\f')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\v/g, '\\v')
      .replace(/\0/g, '\\0') +
    `'`
  )
}

prog
  .command(
    'build clean',
    'Cleans the build artifacts and output directories of all the main packages',
  )
  .action(async () => {
    const packages = [
      'theatre',
      '@unseenco/theatre-dataverse',
      '@unseenco/theatre-react',
      '@unseenco/theatre-browser-bundles',
    ]

    await Promise.all([
      ...packages.map((workspace) => $`yarn workspace ${workspace} run clean`),
    ])
  })

prog.command('build', 'Builds all the main packages').action(async () => {
  const packagesToBuild = [
    'theatre',
    '@unseenco/theatre-dataverse',
    '@unseenco/theatre-react',
    '@unseenco/theatre-browser-bundles',
  ]
  async function build() {
    await Promise.all([
      $`yarn run build:ts`,
      ...packagesToBuild.map(
        (workspace) => $`yarn workspace ${workspace} run build`,
      ),
    ])
  }

  void build()
})

prog
  .command('release <version>', 'Releases all the main packages to npm')
  .option('--skip-ts', 'Skip emitting typescript declarations')
  .option('--skip-lint', 'Skip typecheck and lint')
  .action(async (version, opts) => {
    /**
     * This script publishes all packages to npm.
     *
     * It assigns the same version number to all packages (like lerna's fixed mode).
     **/
    const packagesToBuild = [
      'theatre',
      '@unseenco/theatre-dataverse',
      '@unseenco/theatre-react',
      '@unseenco/theatre-browser-bundles',
    ]

    const packagesToPublish = [
      '@unseenco/theatre-core',
      '@unseenco/theatre-studio',
      '@unseenco/theatre-dataverse',
      '@unseenco/theatre-react',
      '@unseenco/theatre-browser-bundles',
    ]

    const packageDirByName: Record<string, string> = {
      '@unseenco/theatre-core': 'theatre/core',
      '@unseenco/theatre-studio': 'theatre/studio',
      '@unseenco/theatre-dataverse': 'packages/dataverse',
      '@unseenco/theatre-react': 'packages/react',
      '@unseenco/theatre-browser-bundles': 'packages/browser-bundles',
    }

    /**
     * All these packages will have the same version from monorepo/package.json
     */
    const packagesWhoseVersionsShouldBump = [
      '.',
      'theatre',
      'theatre/core',
      'theatre/studio',
      'packages/dataverse',
      'packages/react',
      'packages/browser-bundles',
    ]

    // our packages will check for this env variable to make sure their
    // prepublish script is only called from the `$ cd /path/to/monorepo; yarn run release`
    // @ts-ignore ignore
    process.env.THEATRE_IS_PUBLISHING = true

    async function release() {
      $.verbose = false
      const gitTags = (await $`git tag --list`).toString().split('\n')

      if (typeof version !== 'string') {
        console.error(
          `You need to specify a version, like: $ yarn cli release 1.2.0-rc.4`,
        )
        process.exit(1)
      } else if (
        !version.match(/^[0-9]+\.[0-9]+\.[0-9]+(\-(dev|rc)\.[0-9]+)?$/)
      ) {
        console.error(
          `Use a semver version, like 1.2.3-rc.4. Provided: ${version}`,
        )
        process.exit(1)
      }

      const previousVersion = require('../package.json').version

      if (version === previousVersion) {
        console.error(
          `Version ${version} is already assigned to root/package.json`,
        )
        process.exit(1)
      }

      if (gitTags.some((tag) => tag === version)) {
        console.error(`There is already a git tag for version ${version}`)
        process.exit(1)
      }

      let npmTag = 'latest'
      if (version.match(/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/)) {
        console.log('npm tag: latest')
      } else {
        const matches = version.match(
          /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\-(dev|rc|beta)\.[0-9]{1,3}$/,
        )
        if (!matches) {
          console.log(
            'Invalid version. Currently xx.xx.xx or xx.xx.xx-(dev|rc|beta).xx is allowed',
          )
          process.exit(1)
        }
        npmTag = matches[1]
        console.log('npm tag: ' + npmTag)
      }

      if ((await $`git status -s`).toString().length > 0) {
        console.error(`Git working directory contains uncommitted changes:`)
        $.verbose = true
        await $`git status -s`
        console.log('Commit/stash them and try again.')
        process.exit(1)
      }

      $.verbose = true
      if (opts['skip-lint'] !== true) {
        console.log('Running a typecheck and lint pass')
        await Promise.all([$`yarn run typecheck`, $`yarn run lint:all`])
      } else {
        console.log('Skipping typecheck and lint')
      }

      const skipTypescriptEmit = opts['skip-ts'] === true

      console.log('Assigning versions')
      await writeVersionsToPackageJSONs(version)

      console.log('Building all packages')
      await Promise.all(
        packagesToBuild.map((workspace) =>
          skipTypescriptEmit
            ? $`yarn workspace ${workspace} run build:js`
            : $`yarn workspace ${workspace} run build`,
        ),
      )

      // temporarily rolling back the version assignments to make sure they don't show
      // up in `$ git status`. (would've been better to just ignore hese particular changes
      // but i'm lazy)
      await restoreVersions()

      console.log(
        'Checking if the build produced artifacts that must first be comitted to git',
      )
      $.verbose = false
      if ((await $`git status -s`).toString().length > 0) {
        $.verbose = true
        await $`git status -s`
        console.error(`Git directory contains uncommitted changes.`)
        process.exit(1)
      }

      $.verbose = true

      await writeVersionsToPackageJSONs(version)

      console.log('Committing/tagging')

      await $`git add .`
      await $`git commit -m ${version}`
      await $`git tag ${version}`

      // if (!gitTags.some((tag) => tag === version)) {
      //   console.log(
      //     `No git tag found for version "${version}". Run \`$ git tag ${version}\` and try again.`,
      //   )
      //   process.exit()
      // }

      console.log('Publishing to npm')
      for (const packageName of packagesToPublish) {
        console.log(
          `Publishing ${packageName} from ${packageDirByName[packageName]}`,
        )
        // Use yarn's npm publish so workspace:* deps are rewritten to real versions.
        await $`yarn workspace ${packageName} npm publish --access public --tag ${npmTag}`
      }
    }

    void release()

    async function writeVersionsToPackageJSONs(monorepoVersion: string) {
      for (const packagePathRelativeFromRoot of packagesWhoseVersionsShouldBump) {
        const pathToPackage = path.resolve(
          __dirname,
          '../',
          packagePathRelativeFromRoot,
          './package.json',
        )

        const original = JSON.parse(
          fs.readFileSync(pathToPackage, {encoding: 'utf-8'}),
        )

        const newJson = {...original, version: monorepoVersion}
        fs.writeFileSync(
          path.join(pathToPackage),
          JSON.stringify(newJson, undefined, 2),
          {encoding: 'utf-8'},
        )
        await $`prettier --write ${
          packagePathRelativeFromRoot + '/package.json'
        }`
      }
    }

    async function restoreVersions() {
      const wasVerbose = $.verbose
      $.verbose = false
      for (const packagePathRelativeFromRoot of packagesWhoseVersionsShouldBump) {
        const pathToPackageInGit = packagePathRelativeFromRoot + '/package.json'

        await $`git checkout ${pathToPackageInGit}`
      }
      $.verbose = wasVerbose
    }
  })

prog
  .command(
    'publish',
    'Publishes all packages to npm (use after a release that failed at the publish step)',
  )
  .option('--tag <tag>', 'npm dist-tag', 'latest')
  .action(async (opts) => {
    const packagesToPublish = [
      '@unseenco/theatre-core',
      '@unseenco/theatre-studio',
      '@unseenco/theatre-dataverse',
      '@unseenco/theatre-react',
      '@unseenco/theatre-browser-bundles',
    ]

    const packageDirByName: Record<string, string> = {
      '@unseenco/theatre-core': 'theatre/core',
      '@unseenco/theatre-studio': 'theatre/studio',
      '@unseenco/theatre-dataverse': 'packages/dataverse',
      '@unseenco/theatre-react': 'packages/react',
      '@unseenco/theatre-browser-bundles': 'packages/browser-bundles',
    }

    // @ts-ignore ignore
    process.env.THEATRE_IS_PUBLISHING = true

    const npmTag = opts.tag ?? 'latest'

    for (const packageName of packagesToPublish) {
      console.log(
        `Publishing ${packageName} from ${packageDirByName[packageName]}`,
      )
      // Use yarn's npm publish so workspace:* deps are rewritten to real versions.
      await $`yarn workspace ${packageName} npm publish --access public --tag ${npmTag}`
    }
  })

prog
  .command('dev all', 'Starts all services to develop all of the packages')
  .action(async () => {
    await $`yarn workspace playground run serve`
  })

prog.parse(process.argv)
