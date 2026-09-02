export const WIDGET_JS = `(function () {
if (window.__dshNailongPet) return
window.__dshNailongPet = true

// ─── Constants ───
var ROUTE = '/dsh-nailong-pet'
var SPRITE_URL = ROUTE + '/spritesheet.webp'
var LAUGH_URL = ROUTE + '/laugh.mp3'
var CONFIG_URL = ROUTE + '/config.json'
var SPRITE_W = 1536, SPRITE_H = 2288
var COLS = 8, ROWS = 9
var CELL_W = 192, CELL_H = 208
var MIN_SCALE = 0.5, MAX_SCALE = 3.0
var CLICK_SQ = 25
var ROAM_IDLE_MS = 10000
var ROAM_DIST_MIN = 30, ROAM_DIST_MAX = 80
var ROAM_SPEED_MIN = 10, ROAM_SPEED_MAX = 40
var ROAM_PAUSE_MIN = 3000, ROAM_PAUSE_MAX = 6000
var ROAM_BOUNDARY_PAUSE = 2500

// State → row mapping
var STATE_ROW = {
  'idle': 0, 'walk-right': 1, 'walk-left': 2,
  'laugh': 3, 'laugh2': 4, 'failed': 5,
  'thinking': 6, 'coding': 7, 'review': 8
}
var STATE_LABEL = {
  'idle': '', 'walk-right': '闲逛中...', 'walk-left': '闲逛中...',
  'laugh': '哈哈哈！', 'laugh2': '哈哈哈！', 'failed': '呜呜...',
  'thinking': '思考中...', 'coding': '敲代码中...', 'review': '检查中...'
}
var ONCE_STATES = { 'laugh': 1, 'laugh2': 1, 'failed': 1 }

// ─── CSS ───
var css = [
  '.nlpg-root{position:fixed;right:20px;bottom:20px;--nlpg-scale:1;width:calc(' + CELL_W + 'px * var(--nlpg-scale));height:calc(' + CELL_H + 'px * var(--nlpg-scale));pointer-events:none;user-select:none;-webkit-user-select:none;z-index:9998;font-family:system-ui,-apple-system,sans-serif;transition:left .16s ease,top .16s ease}',
  '.nlpg-root.nlpg-dragging{cursor:grabbing;transition:none}',
  '.nlpg-root.nlpg-flipped .nlpg-pet{transform:scaleX(-1)}',
  '.nlpg-pet{width:100%;height:100%;background-image:url(' + SPRITE_URL + ');background-size:calc(' + SPRITE_W + 'px * var(--nlpg-scale)) calc(' + SPRITE_H + 'px * var(--nlpg-scale));background-position:0 0;background-repeat:no-repeat;pointer-events:none;image-rendering:auto}',
  '.nlpg-hit{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:auto;cursor:grab;z-index:1}',
  '.nlpg-status{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;font-size:calc(12px * var(--nlpg-scale));color:#555;background:rgba(255,255,255,.92);padding:calc(3px * var(--nlpg-scale)) calc(10px * var(--nlpg-scale));border-radius:calc(10px * var(--nlpg-scale));box-shadow:0 1px 6px rgba(0,0,0,.12);pointer-events:none;opacity:0;transition:opacity .3s ease;z-index:2}',
  '.nlpg-status.nlpg-status-on{opacity:1}',
  '.nlpg-menu-btn{position:absolute;top:4px;right:4px;width:24px;height:24px;border:none;border-radius:6px;background:rgba(0,0,0,.45);cursor:pointer;pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:0;z-index:3;opacity:0;transition:opacity .15s ease}',
  '.nlpg-menu-btn:hover{background:rgba(0,0,0,.6)}',
  '.nlpg-menu-btn span{display:block;width:12px;height:2px;background:#fff;border-radius:1px}',
  '.nlpg-root:hover .nlpg-menu-btn{opacity:1}',
  '.nlpg-menu{position:fixed;min-width:180px;background:rgba(255,255,255,.95);border:1px solid rgba(0,0,0,.15);border-radius:10px;padding:10px 12px;opacity:0;transform:scale(.92) translateY(-4px);transform-origin:top right;transition:opacity .18s ease,transform .2s cubic-bezier(.34,1.56,.64,1);pointer-events:none;z-index:10000;box-shadow:0 6px 18px rgba(0,0,0,.15);color-scheme:light}',
  '.nlpg-menu.nlpg-menu-open{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}',
  '.nlpg-row{display:flex;align-items:center;gap:8px;margin:5px 0;color:#333;font-size:12px;white-space:nowrap}',
  '.nlpg-range{flex:1;min-width:0;accent-color:#e74c3c}',
  '.nlpg-check{width:16px;height:16px;accent-color:#e74c3c;cursor:pointer;flex:0 0 auto}',
  '.nlpg-volpct{width:40px;text-align:right;color:#555;font-size:12px}',
  '.nlpg-sep{height:1px;background:rgba(0,0,0,.12);margin:6px 0}',
  '@keyframes nlpg-intro-walk{from{background-position:0 -' + (CELL_H * 1) + 'px}to{background-position:-' + (CELL_W * COLS) + 'px -' + (CELL_H * 1) + 'px}}',
  '@keyframes nlpg-intro-laugh{from{background-position:0 -' + (CELL_H * 3) + 'px}to{background-position:-' + (CELL_W * COLS) + 'px -' + (CELL_H * 3) + 'px}}'
].join('\\n')

var styleEl = document.createElement('style')
styleEl.textContent = css
document.head.appendChild(styleEl)

// ─── DOM ───
var root = document.createElement('div')
root.className = 'nlpg-root'

var petEl = document.createElement('div')
petEl.className = 'nlpg-pet'

var hitEl = document.createElement('div')
hitEl.className = 'nlpg-hit'

var statusEl = document.createElement('div')
statusEl.className = 'nlpg-status'

var menuBtn = document.createElement('button')
menuBtn.type = 'button'
menuBtn.className = 'nlpg-menu-btn'
menuBtn.title = '奶龙设置'
menuBtn.innerHTML = '<span></span><span></span><span></span>'

var menuBox = document.createElement('div')
menuBox.className = 'nlpg-menu'

root.appendChild(petEl)
root.appendChild(hitEl)
root.appendChild(statusEl)
root.appendChild(menuBtn)
root.appendChild(menuBox)
document.body.appendChild(root)

// ─── State ───
var state = {
  left: null, top: null,
  h: 'right', v: 'bottom', // anchor
  hOff: null, vOff: null,
  scale: 1.0,
  animState: 'idle',
  animFrame: 0,
  animTimer: null,
  sound: true,
  volume: 0.9,
  showStatus: true,
  roamEnabled: true,
}

var interacting = false
var roaming = false
var roamTimer = null
var idleTimer = null
var loopTimeout = null
var introPlaying = false
var menuOpen = false
var drag = null
var laughAudio = null

// ─── Viewport & Position Helpers ───
function viewport() {
  return { w: window.innerWidth, h: window.innerHeight }
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function express() {
  root.style.left = state.left + 'px'
  root.style.top = state.top + 'px'
}
function rightGap() { return 0 }
function settle() {
  var vp = viewport()
  var w = root.offsetWidth || CELL_W
  var h = root.offsetHeight || CELL_H
  if (state.h === 'left') { state.left = (state.hOff != null ? state.hOff : 0) }
  else if (state.h === 'right') { state.left = vp.w - w - rightGap() - (state.hOff != null ? state.hOff : 0) }
  if (state.v === 'top') { state.top = (state.vOff != null ? state.vOff : 0) }
  else { state.top = vp.h - h - (state.vOff != null ? state.vOff : 0) }
  state.left = clamp(state.left, 0, Math.max(0, vp.w - w))
  state.top = clamp(state.top, 0, Math.max(0, vp.h - h))
  express()
  root.classList.toggle('nlpg-flipped', state.h === 'left')
}

// ─── Animation Engine ───
var FRAME_MS = 100
function setAnim(stateName) {
  if (state.animState === stateName && state.animTimer) return
  stopAnim()
  state.animState = stateName
  state.animFrame = 0
  renderFrame()
  var totalFrames = COLS
  // For once-states, play all frames then return to idle
  if (ONCE_STATES[stateName]) {
    state.animTimer = setInterval(function () {
      state.animFrame++
      if (state.animFrame >= totalFrames) {
        stopAnim()
        state.animState = 'idle'
        state.animFrame = 0
        renderFrame()
        interacting = false
        // Restart idle timer after interaction ends
        resetIdleTimer()
      } else {
        renderFrame()
      }
    }, FRAME_MS)
  } else {
    state.animTimer = setInterval(function () {
      state.animFrame = (state.animFrame + 1) % totalFrames
      renderFrame()
    }, FRAME_MS)
  }
}
function stopAnim() {
  if (state.animTimer) { clearInterval(state.animTimer); state.animTimer = null }
}
function renderFrame() {
  var row = STATE_ROW[state.animState] != null ? STATE_ROW[state.animState] : 0
  var x = -(state.animFrame * CELL_W * state.scale)
  var y = -(row * CELL_H * state.scale)
  petEl.style.backgroundPosition = x + 'px ' + y + 'px'
}

// ─── Status Text ───
function showStatus(text) {
  if (!state.showStatus || !text) { statusEl.classList.remove('nlpg-status-on'); return }
  statusEl.textContent = text
  statusEl.classList.add('nlpg-status-on')
}
function hideStatus() {
  statusEl.classList.remove('nlpg-status-on')
}
function updateStatus() {
  var label = STATE_LABEL[state.animState] || ''
  if (label) showStatus(label)
  else hideStatus()
}

// ─── Scale ───
function applyScale(s) {
  state.scale = clamp(s, MIN_SCALE, MAX_SCALE)
  root.style.setProperty('--nlpg-scale', String(state.scale))
  renderFrame()
}

// ─── Sound ───
function initSound() {
  if (laughAudio) return
  try {
    laughAudio = new Audio(LAUGH_URL)
    laughAudio.preload = 'auto'
    laughAudio.volume = state.volume
  } catch (err) {}
}
function playLaugh() {
  if (!state.sound || !laughAudio) return
  try {
    laughAudio.currentTime = 0
    laughAudio.volume = state.volume
    var p = laughAudio.play()
    if (p && typeof p.catch === 'function') p.catch(function () {})
  } catch (err) {}
}

// ─── Config Persistence ───
function saveConfig() {
  try {
    fetch(CONFIG_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scale: state.scale,
        sound: state.sound,
        volume: state.volume,
        showStatus: state.showStatus,
        roamEnabled: state.roamEnabled,
      })
    }).catch(function () {})
    // Save position to localStorage
    var vp = viewport()
    var w = root.offsetWidth || CELL_W
    var h = root.offsetHeight || CELL_H
    var leftDist = state.left
    var rightDist = vp.w - state.left - w
    var topDist = state.top
    var bottomDist = vp.h - state.top - h
    var hAnchor = leftDist <= rightDist ? 'left' : 'right'
    var hDist = Math.round(Math.min(leftDist, rightDist))
    var vAnchor = topDist <= bottomDist ? 'top' : 'bottom'
    var vDist = Math.round(Math.min(topDist, bottomDist))
    localStorage.setItem('nlpg-pos', JSON.stringify({
      v: 1, hAnchor: hAnchor, hDist: hDist, vAnchor: vAnchor, vDist: vDist
    }))
  } catch (err) {}
}
function loadConfig() {
  return fetch(CONFIG_URL).then(function (r) { return r.json() }).then(function (cfg) {
    if (cfg && typeof cfg.scale === 'number') {
      state.scale = clamp(cfg.scale, MIN_SCALE, MAX_SCALE)
      state.sound = cfg.sound !== false
      state.volume = typeof cfg.volume === 'number' ? clamp(cfg.volume, 0, 1) : 0.9
      state.showStatus = cfg.showStatus !== false
      state.roamEnabled = cfg.roamEnabled !== false
    }
  }).catch(function () {})
}
function loadPosition() {
  try {
    var raw = localStorage.getItem('nlpg-pos')
    if (!raw) return false
    var p = JSON.parse(raw)
    if (!p || !p.hAnchor) return false
    var vp = viewport()
    var w = root.offsetWidth || CELL_W
    var h = root.offsetHeight || CELL_H
    state.h = p.hAnchor
    state.v = p.vAnchor || 'bottom'
    state.hOff = typeof p.hDist === 'number' ? p.hDist : 0
    state.vOff = typeof p.vDist === 'number' ? p.vDist : 0
    settle()
    return true
  } catch (err) { return false }
}

// ─── Whale Detection (coexistence) ───
function detectWhaleCorner() {
  try {
    var whale = document.querySelector('.dshwv-root')
    if (!whale) return 'right'
    var rect = whale.getBoundingClientRect()
    var cx = rect.left + rect.width / 2
    var cy = rect.top + rect.height / 2
    var vp = viewport()
    // Whale in bottom-right → nailong goes bottom-left
    if (cx > vp.w / 2 && cy > vp.h / 2) return 'left'
    // Whale in bottom-left → nailong goes bottom-right
    if (cx < vp.w / 2 && cy > vp.h / 2) return 'right'
    // Default: opposite side
    return cx > vp.w / 2 ? 'left' : 'right'
  } catch (err) { return 'right' }
}

// ─── Intro Animation ───
function playIntro() {
  introPlaying = true
  interacting = true
  var vp = viewport()
  var w = root.offsetWidth || CELL_W
  var h = root.offsetHeight || CELL_H
  var defaultSide = detectWhaleCorner()
  var targetLeft = defaultSide === 'left' ? 20 : vp.w - w - 20

  // Start from left edge
  state.left = -w - 10
  state.top = vp.h - h - 20
  state.h = defaultSide
  state.v = 'bottom'
  express()
  root.classList.toggle('nlpg-flipped', false) // walking right

  setAnim('walk-right')
  showStatus('你好呀~')

  // Walk to target position
  var startX = state.left
  var distance = targetLeft - startX
  var speed = 150 // px/s for intro
  var duration = Math.abs(distance) / speed * 1000
  duration = Math.max(1000, Math.min(3000, duration))

  var startTime = performance.now()
  function walkStep(now) {
    var elapsed = now - startTime
    var progress = Math.min(1, elapsed / duration)
    state.left = startX + distance * progress
    express()
    if (progress < 1) {
      requestAnimationFrame(walkStep)
    } else {
      // Arrived! Switch to laugh
      state.left = targetLeft
      express()
      setAnim('laugh')
      showStatus('我是奶龙~')
      playLaugh()

      // Wait for laugh to finish (8 frames * 100ms = 800ms)
      setTimeout(function () {
        setAnim('idle')
        hideStatus()
        introPlaying = false
        interacting = false
        settle()
        saveConfig()
        resetIdleTimer()
      }, 850)
    }
  }
  requestAnimationFrame(walkStep)
}

// ─── Roaming (idle walk) ───
var savedLeft = null, savedTop = null
function startRoaming() {
  if (roaming || interacting || introPlaying || !state.roamEnabled) return
  roaming = true
  // Save current position before roaming
  savedLeft = state.left
  savedTop = state.top
  roamingLoop()
}
function stopRoaming() {
  if (!roaming) return
  roaming = false
  if (roamTimer) { clearTimeout(roamTimer); roamTimer = null }
  // Flash back to saved position
  if (savedLeft != null && savedTop != null) {
    state.left = savedLeft
    state.top = savedTop
    express()
  }
  setAnim('idle')
  hideStatus()
  resetIdleTimer()
}
function roamingLoop() {
  if (!roaming || interacting) return

  var vp = viewport()
  var w = root.offsetWidth || CELL_W
  var h = root.offsetHeight || CELL_H

  // Random direction
  var angle = Math.random() * Math.PI * 2
  var dist = ROAM_DIST_MIN + Math.random() * (ROAM_DIST_MAX - ROAM_DIST_MIN)
  var dx = Math.cos(angle) * dist
  var dy = Math.sin(angle) * dist

  var targetX = clamp(state.left + dx, 0, vp.w - w)
  var targetY = clamp(state.top + dy, 0, vp.h - h)
  var actualDx = targetX - state.left
  var actualDist = Math.sqrt(actualDx * actualDx + (targetY - state.top) * (targetY - state.top))

  // If barely moved (stuck at boundary), pause and retry
  if (actualDist < 5) {
    setAnim('idle')
    hideStatus()
    roamTimer = setTimeout(roamingLoop, ROAM_BOUNDARY_PAUSE)
    return
  }

  // Set walk animation based on direction
  if (actualDx >= 0) {
    setAnim('walk-right')
    root.classList.toggle('nlpg-flipped', false)
  } else {
    setAnim('walk-left')
    root.classList.toggle('nlpg-flipped', true)
  }
  updateStatus()

  // Slow movement
  var speed = ROAM_SPEED_MIN + Math.random() * (ROAM_SPEED_MAX - ROAM_SPEED_MIN)
  var duration = Math.max(1500, (actualDist / speed) * 1000)

  var startX = state.left, startY = state.top
  var startTime = performance.now()

  function step(now) {
    if (!roaming || interacting) return
    var elapsed = now - startTime
    var progress = Math.min(1, elapsed / duration)
    // Ease-in-out for smooth movement
    var t = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
    state.left = startX + (targetX - startX) * t
    state.top = startY + (targetY - startY) * t
    express()
    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      // Arrived, pause then continue
      setAnim('idle')
      hideStatus()
      var pause = ROAM_PAUSE_MIN + Math.random() * (ROAM_PAUSE_MAX - ROAM_PAUSE_MIN)
      roamTimer = setTimeout(roamingLoop, pause)
    }
  }
  requestAnimationFrame(step)
}

// ─── Idle Timer ───
function resetIdleTimer() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
  if (interacting || introPlaying) return
  idleTimer = setTimeout(function () {
    if (!interacting && !introPlaying) startRoaming()
  }, ROAM_IDLE_MS)
}

// ─── Interaction ───
function onInteract() {
  if (introPlaying) return
  if (roaming) stopRoaming()
  interacting = true
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }

  // Random laugh or laugh2
  var laughState = Math.random() > 0.5 ? 'laugh' : 'laugh2'
  setAnim(laughState)
  updateStatus()
  playLaugh()
  // Once-state auto-returns to idle and sets interacting=false
}

// ─── DSH Session Event Mapping ───
function handleDSHEvent(type) {
  if (introPlaying) return
  dbgLog('EVT→', type, '| prevAnim=' + state.animState)
  if (interacting && ONCE_STATES[state.animState]) return // Don't interrupt active laugh/failed

  // Map DSH events to nailong states
  var newState = null
  if (type === 'laugh') {
    newState = 'laugh'
  } else if (type === 'laugh2') {
    newState = 'laugh2'
  } else if (type === 'thinking') {
    newState = 'thinking'
  } else if (type === 'coding') {
    newState = 'coding'
  } else if (type === 'review') {
    newState = 'review'
  } else if (type === 'failed') {
    newState = 'failed'
  }

  if (newState && newState !== state.animState) {
    if (roaming) stopRoaming()
    interacting = true
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
    if (loopTimeout) { clearTimeout(loopTimeout); loopTimeout = null }
    setAnim(newState)
    updateStatus()
    if (newState === 'laugh' || newState === 'laugh2') playLaugh()
    // For loop states, set a safety timeout to return to idle
    if (!ONCE_STATES[newState]) {
      loopTimeout = setTimeout(function () {
        if (state.animState === newState) {
          setAnim('idle')
          hideStatus()
          interacting = false
          resetIdleTimer()
        }
      }, 30000)
    }
  }
}

// Connect to SSE for real-time DSH events
var lastEventSeq = 0
function connectSSE() {
  try {
    var es = new EventSource(ROUTE + '/events.sse')
    es.onmessage = function (e) {
      try {
        var d = JSON.parse(e.data)
        dbgLog('SSE rcvd seq=' + d.seq + ' type=' + d.type)
        if (d && d.type && d.seq > lastEventSeq) {
          lastEventSeq = d.seq
          handleDSHEvent(d.type)
        }
      } catch (err) { dbgLog('SSE parse err', err.message) }
    }
    es.onerror = function () {
      dbgLog('SSE error/closed')
      es.close()
      // Fallback: poll events.json every 3 seconds
      setTimeout(connectSSE, 3000)
    }
  } catch (err) {
    // SSE not supported, fallback to polling
    startEventPolling()
  }
}

function startEventPolling() {
  setInterval(function () {
    fetch(ROUTE + '/events.json').then(function (r) { return r.json() }).then(function (d) {
      if (d && d.type && d.seq > lastEventSeq) {
        lastEventSeq = d.seq
        handleDSHEvent(d.type)
      }
    }).catch(function () {})
  }, 3000)
}

// ─── Drag ───
function onPointerDown(e) {
  if (menuOpen) { closeMenu(); return }
  if (e.button !== 0 && e.pointerType === 'mouse') return
  if (e.target.closest && (e.target.closest('.nlpg-menu') || e.target.closest('.nlpg-menu-btn'))) return
  try { e.preventDefault(); e.stopPropagation() } catch (err) {}

  var vp = viewport()
  var rect = root.getBoundingClientRect()
  drag = {
    active: true, startX: e.clientX, startY: e.clientY,
    origLeft: rect.left, origTop: rect.top,
    w: rect.width, h: rect.height, moved: false, vp: vp
  }
  root.classList.add('nlpg-dragging')
  onInteract()
  document.addEventListener('pointermove', onPointerMove, true)
  document.addEventListener('pointerup', onPointerUp, true)
  document.addEventListener('pointercancel', onPointerCancel, true)
}
function onPointerMove(e) {
  if (!drag || !drag.active) return
  var dx = e.clientX - drag.startX
  var dy = e.clientY - drag.startY
  if (dx * dx + dy * dy >= CLICK_SQ) drag.moved = true
  state.left = clamp(drag.origLeft + dx, 0, Math.max(0, drag.vp.w - drag.w))
  state.top = clamp(drag.origTop + dy, 0, Math.max(0, drag.vp.h - drag.h))
  express()
}
function onPointerUp(e) {
  if (!drag) return
  document.removeEventListener('pointermove', onPointerMove, true)
  document.removeEventListener('pointerup', onPointerUp, true)
  document.removeEventListener('pointercancel', onPointerCancel, true)
  root.classList.remove('nlpg-dragging')
  if (drag.moved) {
    // Snap to nearest corner
    snapToCorner()
    saveConfig()
  } else {
    // It was a click
    onInteract()
  }
  drag = null
}
function onPointerCancel() {
  if (!drag) return
  document.removeEventListener('pointermove', onPointerMove, true)
  document.removeEventListener('pointerup', onPointerUp, true)
  document.removeEventListener('pointercancel', onPointerCancel, true)
  root.classList.remove('nlpg-dragging')
  drag = null
}
function snapToCorner() {
  var rect = root.getBoundingClientRect()
  var vp = viewport()
  var w = rect.width, h = rect.height
  var centerX = rect.left + w / 2
  var centerY = rect.top + h / 2
  if (centerX < vp.w / 2) {
    state.h = 'left'; state.hOff = 0; state.left = 0
  } else {
    state.h = 'right'; state.hOff = 0; state.left = vp.w - w
  }
  if (centerY < vp.h / 2) {
    state.v = 'top'; state.vOff = 0; state.top = 0
  } else {
    state.v = 'bottom'; state.vOff = 0; state.top = vp.h - h
  }
  state.left = clamp(state.left, 0, Math.max(0, vp.w - w))
  state.top = clamp(state.top, 0, Math.max(0, vp.h - h))
  express()
  root.classList.toggle('nlpg-flipped', state.h === 'left')
  settle()
}

// ─── Menu ───
function toggleMenu() {
  menuOpen = !menuOpen
  if (menuOpen) positionMenu()
  menuBox.classList.toggle('nlpg-menu-open', menuOpen)
}
function closeMenu() {
  menuOpen = false
  menuBox.classList.remove('nlpg-menu-open')
}
function positionMenu() {
  try {
    var b = menuBtn.getBoundingClientRect()
    var vp = viewport()
    var onLeft = b.left + b.width / 2 < vp.w / 2
    if (onLeft) {
      menuBox.style.left = b.left + 'px'
      menuBox.style.right = 'auto'
      menuBox.style.transformOrigin = 'bottom left'
    } else {
      menuBox.style.right = (vp.w - b.right) + 'px'
      menuBox.style.left = 'auto'
      menuBox.style.transformOrigin = 'bottom right'
    }
    menuBox.style.bottom = (vp.h - b.top) + 'px'
    menuBox.style.top = 'auto'
  } catch (err) {}
}

// Build menu UI
function buildMenu() {
  function label(t) { var s = document.createElement('span'); s.textContent = t; return s }
  function row() { var r = document.createElement('div'); r.className = 'nlpg-row'; return r }

  // Scale
  var r1 = row()
  r1.appendChild(label('缩放'))
  var scaleRange = document.createElement('input')
  scaleRange.type = 'range'; scaleRange.min = '0.5'; scaleRange.max = '3'; scaleRange.step = '0.1'
  scaleRange.className = 'nlpg-range'; scaleRange.value = String(state.scale)
  scaleRange.addEventListener('input', function () { applyScale(Number(scaleRange.value)); saveConfig() })
  r1.appendChild(scaleRange)
  menuBox.appendChild(r1)

  // Volume
  var r2 = row()
  r2.appendChild(label('音量'))
  var volRange = document.createElement('input')
  volRange.type = 'range'; volRange.min = '0'; volRange.max = '1'; volRange.step = '0.05'
  volRange.className = 'nlpg-range'; volRange.value = String(state.volume)
  var volPct = document.createElement('span')
  volPct.className = 'nlpg-volpct'; volPct.textContent = Math.round(state.volume * 100) + '%'
  volRange.addEventListener('input', function () {
    state.volume = Number(volRange.value)
    volPct.textContent = Math.round(state.volume * 100) + '%'
    if (laughAudio) laughAudio.volume = state.volume
    saveConfig()
  })
  r2.appendChild(volRange)
  r2.appendChild(volPct)
  menuBox.appendChild(r2)

  menuBox.appendChild((function () { var s = document.createElement('div'); s.className = 'nlpg-sep'; return s })())

  // Sound toggle
  var r3 = row()
  var soundCheck = document.createElement('input')
  soundCheck.type = 'checkbox'; soundCheck.className = 'nlpg-check'; soundCheck.checked = state.sound
  soundCheck.addEventListener('change', function () { state.sound = soundCheck.checked; saveConfig() })
  r3.appendChild(soundCheck)
  r3.appendChild(label('音效'))
  menuBox.appendChild(r3)

  // Status text toggle
  var r4 = row()
  var statusCheck = document.createElement('input')
  statusCheck.type = 'checkbox'; statusCheck.className = 'nlpg-check'; statusCheck.checked = state.showStatus
  statusCheck.addEventListener('change', function () {
    state.showStatus = statusCheck.checked
    if (!state.showStatus) hideStatus()
    saveConfig()
  })
  r4.appendChild(statusCheck)
  r4.appendChild(label('状态文字'))
  menuBox.appendChild(r4)

  // Roam toggle
  var r5 = row()
  var roamCheck = document.createElement('input')
  roamCheck.type = 'checkbox'; roamCheck.className = 'nlpg-check'; roamCheck.checked = state.roamEnabled
  roamCheck.addEventListener('change', function () {
    state.roamEnabled = roamCheck.checked
    if (!state.roamEnabled && roaming) stopRoaming()
    saveConfig()
  })
  r5.appendChild(roamCheck)
  r5.appendChild(label('空闲漫游'))
  menuBox.appendChild(r5)
}

// ─── Event Bindings ───
hitEl.addEventListener('pointerdown', onPointerDown)
menuBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu() })

// Close menu on outside click
document.addEventListener('pointerdown', function (e) {
  if (menuOpen && !e.target.closest('.nlpg-menu') && !e.target.closest('.nlpg-menu-btn')) {
    closeMenu()
  }
})

// Stop roaming on user activity
;['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(function (evt) {
  document.addEventListener(evt, function () {
    if (roaming && !drag) stopRoaming()
  }, { passive: true })
})

// Resize handler
window.addEventListener('resize', function () {
  if (introPlaying) return
  settle()
})

// ─── Initialization ───
function init() {
  initSound()
  buildMenu()
  loadConfig().then(function () {
    applyScale(state.scale)
    // Try to load saved position
    var hasPos = loadPosition()
    if (!hasPos) {
      // Default: detect whale and pick opposite corner
      var side = detectWhaleCorner()
      state.h = side
      state.v = 'bottom'
      state.hOff = 0
      state.vOff = 0
      settle()
    }
    // Connect to DSH event stream
    connectSSE()
    // Play intro animation
    setTimeout(function () { playIntro() }, 300)
  })
}

if (document.readyState === 'complete') {
  init()
} else {
  window.addEventListener('load', init)
}

// ─── Debug Panel (toggle with F2, or when ?nlpgDebug=1) ───
var dbgBox = null
var dbgOn = /[?&]nlpgDebug=1/.test(location.search)
function buildDebugPanel() {
  if (dbgBox) return
  dbgBox = document.createElement('div')
  dbgBox.style.cssText = 'position:fixed;right:10px;bottom:10px;max-width:360px;background:rgba(20,20,30,.9);color:#0f0;font:11px/1.5 monospace;padding:8px 10px;border-radius:8px;z-index:200000;pointer-events:none;white-space:pre-wrap;display:none'
  document.body.appendChild(dbgBox)
}
function dbgLog() {
  if (!dbgOn || !dbgBox) return
  var args = Array.prototype.slice.call(arguments)
  dbgBox.textContent = args.join(' ')
}
// Expose some internals for debugging
window.__nlpgDebug = {
  setAnim: function (s) { try { setAnim(s); updateStatus() } catch (e) { return 'err ' + e.message } return 'now ' + s },
  getState: function () { return state.animState },
  handleDSHEvent: function (t) { handleDSHEvent(t) },
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'F2') {
    dbgOn = !dbgOn
    if (dbgBox) dbgBox.style.display = dbgOn ? 'block' : 'none'
    if (dbgOn) dbgLog('debug on | current anim=' + state.animState)
  }
})
window.addEventListener('load', function () {
  if (dbgOn) { buildDebugPanel(); dbgBox.style.display = 'block'; dbgLog('debug ready | anim=' + state.animState) }
})

})()`
