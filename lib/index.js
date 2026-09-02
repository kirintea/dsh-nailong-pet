import fs from 'node:fs'
import {
  SPRITESHEET_PATH,
  LAUGH_SOUND_PATH,
  CONFIG_FILE_CANDIDATES,
  ROUTE_PREFIX,
  JSON_HEADERS,
  DEFAULT_CONFIG,
  clampScale,
  clampVol,
  writeJsonAtomic,
} from './constants.js'
import { WIDGET_JS } from './widget.js'

const name = 'nailong-pet'
const inject = ['webServer']

function apply(ctx) {
  const disposers = []

  // --- DSH Event State Collector ---
  // Collects session events and maps them to nailong animation states.
  // Frontend polls /events.json or subscribes via /events.sse.
  let currentEvent = { type: 'idle', ts: 0, seq: 0 }
  let sseClients = []

  function pushEvent(type) {
    currentEvent = { type, ts: Date.now(), seq: currentEvent.seq + 1 }
    // Push to SSE clients
    const data = JSON.stringify(currentEvent)
    for (let i = sseClients.length - 1; i >= 0; i--) {
      try {
        sseClients[i].write('data: ' + data + '\\n\\n')
      } catch (err) {
        sseClients.splice(i, 1)
      }
    }
  }

  // Map DSH session events to nailong states
  function mapSessionEvent(event) {
    if (!event || typeof event !== 'object') return null
    const type = event.type
    const d = event.data
    if (type === 'turn/start') return 'thinking'
    if (type === 'turn/end') return 'laugh2'
    if (type === 'assistant/message') {
      // Check if it's reasoning/thinking or tool use
      if (d && d.message) {
        const msg = d.message
        if (msg.reasoning_content || (msg.role === 'assistant' && !msg.content)) return 'thinking'
        if (msg.tool_calls || msg.tool_call_id) return 'coding'
      }
      return null
    }
    if (type === 'tool/start' || type === 'tool_use') return 'coding'
    if (type === 'review') return 'review'
    if (type === 'error' || type === 'task_failed') return 'failed'
    if (type === 'session/created') return 'laugh'
    return null
  }

  // Listen to all session events
  disposers.push(ctx.on('session/event', (session, event) => {
    try {
      const mapped = mapSessionEvent(event)
      if (mapped) pushEvent(mapped)
    } catch (err) {}
  }))

  // --- Asset caches ---
  let spritesheetCache = null
  let laughCache = null

  function loadSpritesheet() {
    if (spritesheetCache) return spritesheetCache
    try {
      spritesheetCache = fs.readFileSync(SPRITESHEET_PATH)
    } catch (err) {
      console.error('[nailong-pet] spritesheet not found:', SPRITESHEET_PATH)
    }
    return spritesheetCache
  }

  function loadLaugh() {
    if (laughCache) return laughCache
    try {
      laughCache = fs.readFileSync(LAUGH_SOUND_PATH)
    } catch (err) {
      console.error('[nailong-pet] laugh sound not found:', LAUGH_SOUND_PATH)
    }
    return laughCache
  }

  // --- Config persistence ---
  function readConfig() {
    for (const p of CONFIG_FILE_CANDIDATES) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'))
        if (parsed && typeof parsed === 'object' && typeof parsed.scale === 'number') {
          return {
            scale: clampScale(parsed.scale),
            sound: parsed.sound !== false,
            volume: clampVol(typeof parsed.volume === 'number' ? parsed.volume : 0.9),
            showStatus: parsed.showStatus !== false,
            roamEnabled: parsed.roamEnabled !== false,
          }
        }
      } catch (err) {}
    }
    return null
  }

  function writeConfig(cfg) {
    const body = JSON.stringify({
      scale: clampScale(cfg.scale),
      sound: cfg.sound !== false,
      volume: clampVol(cfg.volume),
      showStatus: cfg.showStatus !== false,
      roamEnabled: cfg.roamEnabled !== false,
      updatedAt: new Date().toISOString(),
    })
    for (const p of CONFIG_FILE_CANDIDATES) {
      if (writeJsonAtomic(p, body)) return true
    }
    return false
  }

  // --- Request body reader ---
  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = []
      let size = 0
      req.on('data', (c) => {
        size += c.length
        if (size > 8192) { reject(new Error('body too large')); req.destroy(); return }
        chunks.push(c)
      })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })
  }

  // --- Routes ---

  // GET spritesheet.webp
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PREFIX + '/spritesheet.webp',
    handler: (req, res) => {
      const bytes = loadSpritesheet()
      if (!bytes) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('spritesheet unavailable')
        return
      }
      res.writeHead(200, {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(bytes.length),
      })
      res.end(bytes)
    },
  }))

  // GET laugh.mp3
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PREFIX + '/laugh.mp3',
    handler: (req, res) => {
      const bytes = loadLaugh()
      if (!bytes) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('laugh sound unavailable')
        return
      }
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(bytes.length),
      })
      res.end(bytes)
    },
  }))

  // GET/PUT config.json
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PREFIX + '/config.json',
    handler: async (req, res) => {
      if (req.method === 'PUT' || req.method === 'POST') {
        try {
          const body = await readBody(req)
          const parsed = JSON.parse(body)
          const current = readConfig() || { ...DEFAULT_CONFIG }
          const merged = {
            scale: typeof parsed.scale === 'number' ? clampScale(parsed.scale) : current.scale,
            sound: parsed.sound !== undefined ? !!parsed.sound : current.sound,
            volume: typeof parsed.volume === 'number' ? clampVol(parsed.volume) : current.volume,
            showStatus: parsed.showStatus !== undefined ? !!parsed.showStatus : current.showStatus,
            roamEnabled: parsed.roamEnabled !== undefined ? !!parsed.roamEnabled : current.roamEnabled,
          }
          writeConfig(merged)
          res.writeHead(200, JSON_HEADERS)
          res.end(JSON.stringify({ ok: true, ...merged }))
        } catch (err) {
          res.writeHead(400, JSON_HEADERS)
          res.end(JSON.stringify({ ok: false, error: String((err && err.message) || err) }))
        }
        return
      }
      res.writeHead(200, JSON_HEADERS)
      res.end(JSON.stringify(readConfig() || { ...DEFAULT_CONFIG }))
    },
  }))

  // GET widget.js
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PREFIX + '/widget.js',
    handler: (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(WIDGET_JS)
    },
  }))

  // GET events.json — poll endpoint for DSH session events
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PREFIX + '/events.json',
    handler: (req, res) => {
      res.writeHead(200, JSON_HEADERS)
      res.end(JSON.stringify(currentEvent))
    },
  }))

  // GET events.sse — Server-Sent Events stream for real-time updates
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PREFIX + '/events.sse',
    handler: (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      res.write('data: ' + JSON.stringify(currentEvent) + '\\n\\n')
      sseClients.push(res)
      req.on('close', () => {
        const idx = sseClients.indexOf(res)
        if (idx >= 0) sseClients.splice(idx, 1)
      })
    },
  }))

  // Inject <script> into DSH Web page
  disposers.push(ctx.webServer.tapIndex((html) => {
    if (html.indexOf(ROUTE_PREFIX + '/widget.js') !== -1) return html
    const tag = '<script defer src="' + ROUTE_PREFIX + '/widget.js"></script>'
    if (html.indexOf('</body>') !== -1) return html.replace('</body>', tag + '</body>')
    return html + tag
  }))

  // Cleanup
  ctx.effect(() => () => {
    for (const d of disposers) {
      try { d() } catch (err) {}
    }
  })
}

export { name, inject, apply }
