import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Package root
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// DSH home
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')

// Asset paths
const SPRITESHEET_PATH = path.join(PACKAGE_ROOT, 'assets', 'spritesheet.webp')
const LAUGH_SOUND_PATH = path.join(PACKAGE_ROOT, 'assets', 'laugh.mp3')

// Config file location
const CONFIG_FILE_CANDIDATES = [
  path.join(DSH_HOME, '.dsh-nailong-pet.json'),
  path.join(DSH_HOME, 'profiles', 'desktop', '.dsh-nailong-pet.json'),
]

// Route prefix
const ROUTE_PREFIX = '/dsh-nailong-pet'

// Spritesheet specs
const SPRITE = {
  cols: 8,
  rows: 9,       // 有效行: 0~8 (idle, walk-right, walk-left, laugh, laugh2, failed, thinking, coding, review)
  cellW: 192,
  cellH: 208,
  totalW: 1536,
  totalH: 2288,
}

// State definitions: row index in spritesheet
const STATE_ROW = {
  'idle':      0,
  'walk-right': 1,
  'walk-left':  2,
  'laugh':     3,
  'laugh2':    4,
  'failed':    5,
  'thinking':  6,
  'coding':    7,
  'review':    8,
}

// State display names
const STATE_LABEL = {
  'idle':      '',
  'walk-right': '闲逛中...',
  'walk-left':  '闲逛中...',
  'laugh':     '哈哈哈！',
  'laugh2':    '哈哈哈！',
  'failed':    '呜呜...',
  'thinking':  '思考中...',
  'coding':    '敲代码中...',
  'review':    '检查中...',
}

// Single-play states (play once then return to idle)
const ONCE_STATES = ['laugh', 'laugh2', 'failed']

// Loop states
const LOOP_STATES = ['idle', 'walk-right', 'walk-left', 'thinking', 'coding', 'review']

// Roaming parameters
const ROAM = {
  IDLE_MS:       10000,  // 空闲多久后开始漫游
  DISTANCE_MIN:  30,     // 每次最短移动距离 (px)
  DISTANCE_MAX:  80,     // 每次最长移动距离 (px)
  SPEED_MIN:     10,     // 最慢速度 (px/s)
  SPEED_MAX:     40,     // 最快速度 (px/s)
  PAUSE_MIN:     3000,   // 停顿最短时间 (ms)
  PAUSE_MAX:     6000,   // 停顿最长时间 (ms)
  BOUNDARY_PAUSE: 2500,  // 碰壁后停顿 (ms)
}

// Scale limits
const MIN_SCALE = 0.5
const MAX_SCALE = 3.0

// Animation frame rate (ms per frame)
const FRAME_MS = 100

// Config defaults
const DEFAULT_CONFIG = {
  scale: 1.0,
  sound: true,
  volume: 0.9,
  showStatus: true,
  roamEnabled: true,
}

// JSON response headers
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

// Helpers
function clampScale(v) {
  const n = Number(v)
  if (!isFinite(n)) return 1
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, n))
}

function clampVol(v) {
  const n = Number(v)
  if (!isFinite(n)) return 0.9
  return Math.min(1, Math.max(0, n))
}

function writeJsonAtomic(filePath, body) {
  const tmp = filePath + '.tmp'
  try {
    fs.writeFileSync(tmp, body, 'utf8')
    fs.renameSync(tmp, filePath)
    return true
  } catch (err) {
    try { fs.unlinkSync(tmp) } catch (e) {}
    return false
  }
}

export {
  PACKAGE_ROOT,
  DSH_HOME,
  SPRITESHEET_PATH,
  LAUGH_SOUND_PATH,
  CONFIG_FILE_CANDIDATES,
  ROUTE_PREFIX,
  SPRITE,
  STATE_ROW,
  STATE_LABEL,
  ONCE_STATES,
  LOOP_STATES,
  ROAM,
  MIN_SCALE,
  MAX_SCALE,
  FRAME_MS,
  DEFAULT_CONFIG,
  JSON_HEADERS,
  clampScale,
  clampVol,
  writeJsonAtomic,
}
