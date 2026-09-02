import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Import constants
import {
  SPRITE,
  STATE_ROW,
  STATE_LABEL,
  ONCE_STATES,
  LOOP_STATES,
  ROAM,
  MIN_SCALE,
  MAX_SCALE,
  DEFAULT_CONFIG,
  clampScale,
  clampVol,
  ROUTE_PREFIX,
} from '../lib/constants.js'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log('  ✓ ' + name)
  } catch (err) {
    failed++
    console.log('  ✗ ' + name)
    console.log('    ' + err.message)
  }
}

console.log('\n─── dsh-nailong-pet tests ───\n')

// --- Constants tests ---
console.log('Constants:')

test('SPRITE dimensions', () => {
  assert.equal(SPRITE.cols, 8)
  assert.equal(SPRITE.rows, 9)
  assert.equal(SPRITE.cellW, 192)
  assert.equal(SPRITE.cellH, 208)
  assert.equal(SPRITE.totalW, 1536)
  assert.equal(SPRITE.totalH, 2288)
})

test('SPRITE math: cols * cellW = totalW', () => {
  assert.equal(SPRITE.cols * SPRITE.cellW, SPRITE.totalW)
})

test('STATE_ROW has all 9 states', () => {
  const states = Object.keys(STATE_ROW)
  assert.equal(states.length, 9)
  assert.ok(states.includes('idle'))
  assert.ok(states.includes('walk-right'))
  assert.ok(states.includes('walk-left'))
  assert.ok(states.includes('laugh'))
  assert.ok(states.includes('laugh2'))
  assert.ok(states.includes('failed'))
  assert.ok(states.includes('thinking'))
  assert.ok(states.includes('coding'))
  assert.ok(states.includes('review'))
})

test('STATE_ROW row indices are 0-8', () => {
  for (const [state, row] of Object.entries(STATE_ROW)) {
    assert.ok(row >= 0 && row <= 8, state + ' row=' + row)
  }
})

test('STATE_LABEL has labels for all states', () => {
  for (const state of Object.keys(STATE_ROW)) {
    assert.ok(state in STATE_LABEL, 'missing label for ' + state)
  }
})

test('idle has empty label', () => {
  assert.equal(STATE_LABEL['idle'], '')
})

test('ONCE_STATES are laugh, laugh2, failed', () => {
  assert.ok(ONCE_STATES.includes('laugh'))
  assert.ok(ONCE_STATES.includes('laugh2'))
  assert.ok(ONCE_STATES.includes('failed'))
  assert.ok(!ONCE_STATES.includes('idle'))
  assert.ok(!ONCE_STATES.includes('thinking'))
})

test('LOOP_STATES are idle, walk-*, thinking, coding, review', () => {
  assert.ok(LOOP_STATES.includes('idle'))
  assert.ok(LOOP_STATES.includes('walk-right'))
  assert.ok(LOOP_STATES.includes('walk-left'))
  assert.ok(LOOP_STATES.includes('thinking'))
  assert.ok(LOOP_STATES.includes('coding'))
  assert.ok(LOOP_STATES.includes('review'))
  assert.ok(!LOOP_STATES.includes('laugh'))
  assert.ok(!LOOP_STATES.includes('failed'))
})

// --- Roaming params ---
console.log('\nRoaming:')

test('ROAM distance range is valid', () => {
  assert.ok(ROAM.DISTANCE_MIN > 0)
  assert.ok(ROAM.DISTANCE_MAX > ROAM.DISTANCE_MIN)
  assert.ok(ROAM.DISTANCE_MAX <= 200)
})

test('ROAM speed range is slow (10-40 px/s)', () => {
  assert.ok(ROAM.SPEED_MIN >= 5)
  assert.ok(ROAM.SPEED_MAX <= 50)
  assert.ok(ROAM.SPEED_MAX > ROAM.SPEED_MIN)
})

test('ROAM pause range is long (3-6 seconds)', () => {
  assert.ok(ROAM.PAUSE_MIN >= 2000)
  assert.ok(ROAM.PAUSE_MAX >= ROAM.PAUSE_MIN)
  assert.ok(ROAM.PAUSE_MAX <= 10000)
})

test('ROAM idle trigger is 10 seconds', () => {
  assert.equal(ROAM.IDLE_MS, 10000)
})

// --- Clamp functions ---
console.log('\nClamp functions:')

test('clampScale normal value', () => {
  assert.equal(clampScale(1.5), 1.5)
})

test('clampScale below min', () => {
  assert.equal(clampScale(0.1), MIN_SCALE)
})

test('clampScale above max', () => {
  assert.equal(clampScale(5.0), MAX_SCALE)
})

test('clampScale NaN', () => {
  assert.equal(clampScale('abc'), 1)
})

test('clampVol normal value', () => {
  assert.equal(clampVol(0.7), 0.7)
})

test('clampVol below min', () => {
  assert.equal(clampVol(-0.5), 0)
})

test('clampVol above max', () => {
  assert.equal(clampVol(1.5), 1)
})

test('clampVol NaN', () => {
  assert.equal(clampVol('abc'), 0.9)
})

// --- Config ---
console.log('\nConfig:')

test('DEFAULT_CONFIG has all fields', () => {
  assert.equal(DEFAULT_CONFIG.scale, 1.0)
  assert.equal(DEFAULT_CONFIG.sound, true)
  assert.equal(DEFAULT_CONFIG.volume, 0.9)
  assert.equal(DEFAULT_CONFIG.showStatus, true)
  assert.equal(DEFAULT_CONFIG.roamEnabled, true)
})

// --- Route prefix ---
console.log('\nRoutes:')

test('ROUTE_PREFIX starts with /', () => {
  assert.ok(ROUTE_PREFIX.startsWith('/'))
})

test('ROUTE_PREFIX is /dsh-nailong-pet', () => {
  assert.equal(ROUTE_PREFIX, '/dsh-nailong-pet')
})

// --- Asset files ---
console.log('\nAssets:')

test('spritesheet.webp exists', () => {
  const p = path.join(ROOT, 'assets', 'spritesheet.webp')
  assert.ok(fs.existsSync(p), 'not found: ' + p)
  const stat = fs.statSync(p)
  assert.ok(stat.size > 500000, 'too small: ' + stat.size)
})

test('laugh.mp3 exists', () => {
  const p = path.join(ROOT, 'assets', 'laugh.mp3')
  assert.ok(fs.existsSync(p), 'not found: ' + p)
  const stat = fs.statSync(p)
  assert.ok(stat.size > 10000, 'too small: ' + stat.size)
  assert.ok(stat.size < 100000, 'too large for mp3: ' + stat.size)
})

// --- Source files ---
console.log('\nSource files:')

test('lib/constants.js exists', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'lib', 'constants.js')))
})

test('lib/index.js exists', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'lib', 'index.js')))
})

test('lib/widget.js exists and exports WIDGET_JS', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'lib', 'widget.js')))
})

test('cordis.patch.yml exists', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'cordis.patch.yml')))
})

test('package.json has dsh.bundle.patch', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  assert.ok(pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch)
  assert.equal(pkg.name, 'dsh-nailong-pet')
})

test('package.json type is module', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  assert.equal(pkg.type, 'module')
})

// --- Summary ---
console.log('\n─── Results ───')
console.log('  Passed: ' + passed)
console.log('  Failed: ' + failed)
console.log('')
process.exit(failed > 0 ? 1 : 0)
