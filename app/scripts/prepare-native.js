#!/usr/bin/env node
/**
 * Install the correct better-sqlite3 prebuild for a packaging target.
 * Required when cross-building (e.g. Windows installer from macOS).
 *
 * Usage:
 *   node scripts/prepare-native.js <platform> <arch>
 *   node scripts/prepare-native.js host
 */
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const electronVersion = require('electron/package.json').version
let platform = process.argv[2]
let arch = process.argv[3]

if (platform === 'host' || (!platform && !arch)) {
  platform = process.platform
  arch = process.arch === 'arm64' ? 'arm64' : 'x64'
}

if (!platform || !arch) {
  console.error('Usage: node scripts/prepare-native.js <platform> <arch>')
  console.error('       node scripts/prepare-native.js host')
  console.error('Example: node scripts/prepare-native.js win32 x64')
  process.exit(1)
}

const moduleDir = path.join(__dirname, '..', 'node_modules', 'better-sqlite3')
if (!fs.existsSync(moduleDir)) {
  console.error('better-sqlite3 is not installed. Run npm install first.')
  process.exit(1)
}

console.log(`Installing better-sqlite3 prebuild for ${platform}-${arch} (electron ${electronVersion})…`)

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'prebuild-install',
    '--platform',
    platform,
    '--arch',
    arch,
    '--runtime',
    'electron',
    '--target',
    electronVersion,
    '--force',
  ],
  { cwd: moduleDir, stdio: 'inherit', shell: process.platform === 'win32' },
)

if (result.status !== 0) {
  console.error('Failed to install native prebuild. Check network access and try again.')
  process.exit(result.status ?? 1)
}

const nodePath = path.join(moduleDir, 'build', 'Release', 'better_sqlite3.node')
if (!fs.existsSync(nodePath)) {
  console.error(`Expected native binary missing: ${nodePath}`)
  process.exit(1)
}

console.log(`Native binary ready: ${nodePath}`)
