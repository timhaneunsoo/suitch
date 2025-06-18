// DinoGame.js
import { loadImage } from './utils.js'
import { db } from '@/utils/firebase'
import l1Default from './data/l_New_Layer_1.js'
import l2Default from './data/l_New_Layer_2.js'
import l3Default from './data/l_New_Layer_3.js'
import l4Default from './data/l_New_Layer_4.js'
import { Fighter } from './Fighter.js'
import { setupMultiplayer, subscribeToPlayers } from './multiplayer.js'
import { ref as dbRef, remove, update, onValue } from 'firebase/database'

const l1 = l1Default.default || l1Default
const l2 = l2Default.default || l2Default
const l3 = l3Default.default || l3Default
const l4 = l4Default.default || l4Default

const TILE = 16
const WIDTH = l3[0].length * TILE
const HEIGHT = l3.length * TILE

function renderLayer(tiles, tileset, ctx) {
  const perRow = Math.floor(tileset.width / TILE)
  tiles.forEach((row, y) => {
    row.forEach((sym, x) => {
      if (!sym) return
      const idx = sym - 1
      const sx = (idx % perRow) * TILE
      const sy = Math.floor(idx / perRow) * TILE
      ctx.drawImage(
        tileset,
        sx, sy, TILE, TILE,
        x * TILE, y * TILE, TILE, TILE
      )
    })
  })
}

export async function startGame(canvas, playerId, sprite, name) {
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1

  // Resize canvas on window change
  const resizeCanvas = () => {
    const canvasWidth = window.innerWidth
    const scale = canvasWidth / WIDTH

    canvas.width = WIDTH * scale * dpr
    canvas.height = HEIGHT * scale * dpr

    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${HEIGHT * scale}px`

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(scale * dpr, scale * dpr)
  }

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // Pre-render the background map
  const off = document.createElement('canvas')
  off.width = WIDTH * dpr
  off.height = HEIGHT * dpr
  const offCtx = off.getContext('2d')
  offCtx.scale(dpr, dpr)

  const decor = await loadImage('/games/dino-fight/images/decorations.png')
  const tileset = await loadImage('/games/dino-fight/images/tileset.png')

  renderLayer(l1, decor, offCtx)
  renderLayer(l2, decor, offCtx)
  renderLayer(l3, tileset, offCtx)
  renderLayer(l4, decor, offCtx)

  // Collision tiles
  const collisionSet = new Set()
  l3.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) collisionSet.add(`${x},${y}`)
    })
  })
  const isSolid = (px, py) => {
    const tx = Math.floor(px / TILE)
    const ty = Math.floor(py / TILE)
    return collisionSet.has(`${tx},${ty}`)
  }

  console.log('🎮 Creating local Fighter with sprite:', sprite, 'and playerId:', playerId)

  const player = new Fighter({
    x: 100,
    y: 100,
    dinoName: sprite,
    context: ctx,
    playerId,
    name: name,
  })
  await player.loadSprites()
  player.bindKeys()

  const otherPlayers = {}
  subscribeToPlayers(playerId, (remoteStates) => {
    Object.entries(remoteStates).forEach(([id, data]) => {
      const dino = data?.sprite
      if (!dino) {
        console.warn(`Invalid sprite for player ${id}:`, data)
        return
      }

      if (!otherPlayers[id]) {
        const f = new Fighter({
          x: data.x,
          y: data.y,
          dinoName: data.sprite,
          context: ctx,
          name: data.name,
          playerId: id,
        })
        f.loadSprites()
        otherPlayers[id] = f
      }
      const f = otherPlayers[id]

      if (data.health === 0) {
        if (!f.dead) {
          f.dead = true
          f.action = 'dead'
          f.frame = 0
          f.elapsed = 0
        }
      } else {
        f.x = data.x
        f.y = data.y
        f.facing = data.dir
        f.frame = data.frame
        f.action = data.action || 'idle'
        f.health = data.health
      }

      if (typeof data.health === 'number') {
        f.health = data.health
        if (f.health <= 0 && !f.dead) {
          f.dead = true
          f.action = 'dead'
          f.frame = 0
          f.elapsed = 0
          console.log(`[${id}] is dead`)
        }
      }
    })
  })

  setupMultiplayer(player, playerId)
  // Subscribe to your own health + action changes
  const selfRef = dbRef(db, `dino-fight/live/players/${playerId}`)
  onValue(selfRef, (snap) => {
    const data = snap.val()
    if (!data) return

    // Update your local player’s health if it changed externally
    if (typeof data.health === 'number' && data.health < player.health) {
      console.log(`🩸 ${playerId} got hurt externally → new health: ${data.health}`)
      player.health = data.health
      player.getHurt()
    }
  })

  remove(dbRef(db, `dino-fight/lobby/players/${playerId}`))
  update(dbRef(db, 'dino-fight/lobby'), { started: false })

  function animate() {
    requestAnimationFrame(animate)
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    ctx.drawImage(off, 0, 0, WIDTH, HEIGHT)

    const deathFrames = player.frameCounts.dead || 0
    const finishedDeath = player.dead && player.frame >= deathFrames - 1

    if (!finishedDeath) {
      player.update(isSolid, Object.values(otherPlayers))
      player.draw()
    }

    Object.values(otherPlayers).forEach((f) => {
      const remoteDeathFrames = f.frameCounts.dead || 0
      const remoteFinishedDeath = f.dead && f.frame >= remoteDeathFrames - 1

      if (!remoteFinishedDeath) {
        f.advanceFrame?.()
        f.draw()
      }
    })
  }

  animate()
}
