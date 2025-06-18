// Fighter.js

import { loadImage } from './utils.js'
import l3Default from './data/l_New_Layer_3.js'
import { ref, update } from 'firebase/database'
import { db } from '@/utils/firebase'

const l3 = l3Default.default || l3Default

const TILE_SIZE = 16
const MAP_COLS = l3[0].length
const MAP_ROWS = l3.length
const MAP_WIDTH = MAP_COLS * TILE_SIZE
const MAP_HEIGHT = MAP_ROWS * TILE_SIZE

export class Fighter {
  constructor({ x, y, dinoName, context, playerId, name }) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.speed = 2
    this.gravity = 0.5
    this.jumpStrength = -8

    this.isOnGround = false
    this.attacking = false
    this.attackType = null
    this.hasHit = false
    this.isHurt = false
    this.justGotHurt = false
    this.dead = false
    this.avoiding = false

    this.context = context
    this.dinoName = dinoName
    this.playerId = playerId
    this.name = name || `${playerId}`
    this.health = 100
    this.width = 24
    this.height = 24

    this.action = 'idle'
    this.frame = 0
    this.elapsed = 0
    this.facing = 'right'
    this.keys = { left: false, right: false, up: false }

    this.frameRates = {
      idle: 6,
      move: 6,
      jump: 6,
      bite: 12,
      kick: 12,
      hurt: 8,
      avoid: 12,
    }

    this.frameCounts = {
      idle: 3,
      move: 6,
      jump: 4,
      bite: null,
      kick: null,
      hurt: null,
      dead: null,
      avoid: null,
    }

    this.images = {
      idle: null,
      move: null,
      jump: null,
      bite: null,
      kick: null,
      hurt: null,
      dead: null,
      avoid: null,
    }
  }

  async loadSprites() {
    const base = `/games/dino-fight/sprites/${this.dinoName}`

    const keys = ['idle', 'move', 'jump', 'bite', 'kick', 'hurt', 'dead', 'avoid']
    for (const key of keys) {
      const img = await loadImage(`${base}/${key}.png`)
      this.images[key] = img
      this.frameCounts[key] = img.width / this.width
      console.log(`${key} loaded with ${this.frameCounts[key]} frames`)
    }
  }

  bindKeys() {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a': this.keys.left = true; this.facing = 'left'; break
        case 'ArrowRight':
        case 'd': this.keys.right = true; this.facing = 'right'; break
        case 'ArrowUp':
        case 'w':
        case ' ': this.keys.up = true; break
        case 'j': this.startAttack('bite'); break
        case 'k': this.startAttack('kick'); break
        case 'i': this.startAttack('avoid'); break
      }
    })

    window.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a': this.keys.left = false; break
        case 'ArrowRight':
        case 'd': this.keys.right = false; break
        case 'ArrowUp':
        case 'w':
        case ' ': this.keys.up = false; break
      }
    })
  }

  startAttack(type) {
    if (this.attacking || this.isHurt) return
    this.attacking = true
    this.attackType = type
    this.action = type
    this.frame = 0
    this.elapsed = 0
    this.hasHit = false
    console.log(`[${this.playerId}] started ${type} attack`)
  }

  startAvoid() {
    if (this.avoiding || this.isHurt || this.dead) return
    this.avoiding = true
    this.action = 'avoid'
    this.frame = 0
    this.elapsed = 0
    setTimeout(() => {
      this.avoiding = false
    }, 1000) // for example, 1s duration
  }

  update(isSolid, fighters = []) {
    if (this.dead) {
      this.advanceFrame()
      return
    }

    if (this.isHurt) {
      this.advanceFrame(() => (this.isHurt = false))
    }

    if (!this.attacking) {
      const { left, right, up } = this.keys
      this.vx = left ? -this.speed : right ? this.speed : 0
      if (up && this.isOnGround) {
        this.vy = this.jumpStrength
        this.isOnGround = false
      }
      this.vy += this.gravity
    }

    // Horizontal movement
    const nextX = this.x + this.vx
    const topY = this.y
    const botY = this.y + this.height - 1
    const leftX = nextX + 2
    const rightX = nextX + this.width - 2
    const canH = !(
      isSolid(leftX, topY) || isSolid(leftX, botY) ||
      isSolid(rightX, topY) || isSolid(rightX, botY)
    )

    if (canH) this.x = Math.max(0, Math.min(nextX, MAP_WIDTH - this.width))
    else this.vx = 0

    // Vertical movement
    const nextY = this.y + this.vy
    const topC = nextY
    const botC = nextY + this.height - 1
    const leftC = this.x + 2
    const rightC = this.x + this.width - 2
    const canV = !(
      isSolid(leftC, botC) || isSolid(rightC, botC) ||
      isSolid(leftC, topC) || isSolid(rightC, topC)
    )

    if (canV) {
      if (nextY < 0) this.y = 0
      else if (nextY + this.height > MAP_HEIGHT) {
        this.y = MAP_HEIGHT - this.height
        this.vy = 0
        this.isOnGround = true
      } else {
        this.y = nextY
        this.isOnGround = false
      }
    } else {
      if (this.vy > 0) this.isOnGround = true
      this.vy = 0
    }

    // Hit detection
    if (this.attacking && this.frame >= 1 && this.frame <= 3 && !this.hasHit) {
      const hb = {
        x: this.facing === 'right' ? this.x + this.width : this.x - 12,
        y: this.y + 4,
        width: 12,
        height: this.height - 8,
      }
      console.log('Attacker:', this.x, this.y, this.facing)

      for (const other of fighters) {
        if (other === this || other.isHurt || other.avoiding) continue
        if (
          hb.x < other.x + other.width &&
          hb.x + hb.width > other.x &&
          hb.y < other.y + other.height &&
          hb.y + hb.height > other.y
        ) {
          console.log(`Hit detected: ${this.playerId} → ${other.playerId}`)
          if (other.playerId && !this.hasHit) {
            update(ref(db, `dino-fight/live/players/${other.playerId}`), {
              health: Math.max(0, other.health - 10),
              action: 'hurt',
              frame: 0,
            })
            console.log(`🧨 Sent damage to ${other.playerId}`)
            this.hasHit = true
          }
        }
      }
    }

    // Animation state
    if (this.isHurt) {
      this.action = 'hurt'
      this.advanceFrame(() => (this.isHurt = false))
    } else if (this.attacking) {
      this.action = this.attackType
      this.advanceFrame(() => {
        this.attacking = false
        this.attackType = null
        this.hasHit = false
        console.log(`[${this.playerId}] finished attack`)
      })
    } else if (!this.isOnGround) {
      this.action = 'jump'
      this.advanceFrame()
    } else if (this.vx !== 0) {
      this.action = 'move'
      this.advanceFrame()
    } else {
      this.action = 'idle'
      this.advanceFrame()
    }

  }

  advanceFrame(onLoop) {
    const fps = this.frameRates[this.action] || 6
    const frameCount = this.frameCounts[this.action]
    this.elapsed++

    if (this.elapsed >= 60 / fps) {
      this.elapsed = 0
      this.frame++

      if (this.frame >= frameCount) {
        if (this.action === 'dead') {
          // Stop at last frame for death
          this.frame = frameCount - 1
          return
        }

        this.frame = 0
        if (onLoop) {
          onLoop()
          this.hasHit = false
          this.attacking = false
          this.attackType = null
          console.log(`[${this.playerId}] (fallback) force reset attack state`)
        }
      }

    }
  }

  getHurt() {
    if (this.isHurt || this.dead) return
    this.health = Math.max(0, this.health - 10)
    this.justGotHurt = true

    if (this.health <= 0) {
      this.dead = true
      this.action = 'dead'
      this.frame = 0
      this.elapsed = 0
      update(ref(db, `dino-fight/live/players/${this.playerId}`), {
        health: 0,
        action: 'dead',
        frame: 0,
      })
      console.log(`[${this.playerId}] died`)
      return
    }

    this.isHurt = true
    this.action = 'hurt'
    this.frame = 0
    this.elapsed = 0
  }

  draw() {
    if (this.dead && this.frame >= this.frameCounts.death - 1) return

    const img = this.images[this.action]
    if (!img) return

    const sx = this.frame * this.width
    const ctx = this.context

    // First draw the sprite with optional flipping
    ctx.save()

    if (this.facing === 'left') {
      ctx.translate(this.x + this.width, this.y)
      ctx.scale(-1, 1)
      ctx.drawImage(img, sx, 0, this.width, this.height, 0, 0, this.width, this.height)
    } else {
      ctx.drawImage(img, sx, 0, this.width, this.height, this.x, this.y, this.width, this.height)
    }

    ctx.restore()

    // Now draw name and health bar WITHOUT flipping
    ctx.save()

    // ✅ Draw name
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'white'
    ctx.fillText(this.name || '', this.x + this.width / 2, this.y - 10)

    // ✅ Draw health bar
    const barWidth = this.width
    const barHeight = 4
    const healthRatio = Math.max(0, this.health / 100)

    ctx.fillStyle = 'red'
    ctx.fillRect(this.x, this.y - 6, barWidth, barHeight)
    ctx.fillStyle = 'lime'
    ctx.fillRect(this.x, this.y - 6, barWidth * healthRatio, barHeight)

    // 🔍 Debug hitbox for attacks
    if (this.attacking && this.frame >= 1 && this.frame <= 3) {
      const hbX = this.facing === 'right' ? this.x + this.width : this.x - 12
      ctx.strokeStyle = 'yellow'
      ctx.lineWidth = 1
      ctx.strokeRect(hbX, this.y + 4, 12, this.height - 8)
    }

    ctx.restore()
  }

}
