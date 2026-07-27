#!/usr/bin/env node
/**
 * Package the app for one or more targets with the correct native module.
 *
 * Usage:
 *   node scripts/pack.js win
 *   node scripts/pack.js mac
 *   node scripts/pack.js linux
 */
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const target = process.argv[2]
const root = path.join(__dirname, '..')

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
    ...opts,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function prepare(platform, arch) {
  run(process.execPath, [path.join('scripts', 'prepare-native.js'), platform, arch])
}

function restoreHostNative() {
  run(process.execPath, [path.join('scripts', 'prepare-native.js'), 'host'])
}

function electronBuilder(args) {
  run(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['electron-builder', ...args, '--config.npmRebuild=false'],
  )
}

if (!target) {
  console.error('Usage: node scripts/pack.js <win|mac|linux>')
  process.exit(1)
}

run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'])

try {
  if (target === 'win') {
    prepare('win32', 'x64')
    electronBuilder(['--win', '--x64'])
  } else if (target === 'mac') {
    prepare('darwin', 'arm64')
    electronBuilder(['--mac', '--arm64'])
    prepare('darwin', 'x64')
    electronBuilder(['--mac', '--x64'])
  } else if (target === 'linux') {
    prepare('linux', 'x64')
    electronBuilder(['--linux', '--x64'])
  } else {
    console.error(`Unknown target: ${target}`)
    process.exit(1)
  }
} finally {
  // Keep local `npm run dev` working after packaging.
  restoreHostNative()
}

console.log(`\nPackaging complete for ${target}. Share files from the release/ folder.`)
