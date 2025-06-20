'use client'
import { useEffect, useRef, useState } from 'react'

type Platform = { x: number; y: number; tiles: number }
type Coin = { x: number; y: number; collected: boolean }

export default function DinoRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dinoId] = useState(() => Math.floor(Math.random() * 8) + 1)

  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 480
  const ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT

  useEffect(() => {
    const canvas = canvasRef.current!
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    // Set fixed internal canvas resolution
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT

    // Responsive CSS scaling function preserving aspect ratio
    function resizeCanvasCSS() {
      const parent = canvas.parentElement
      if (!parent) return

      const parentWidth = parent.clientWidth
      const parentHeight = parent.clientHeight

      let newWidth = parentWidth
      let newHeight = parentWidth / ASPECT_RATIO

      if (newHeight > parentHeight) {
        newHeight = parentHeight
        newWidth = newHeight * ASPECT_RATIO
      }

      canvas.style.width = `${newWidth}px`
      canvas.style.height = `${newHeight}px`
    }

    // Initial resize and add listener
    resizeCanvasCSS()
    window.addEventListener('resize', resizeCanvasCSS)

    // Your game constants and variables
    const SCALE = 2
    const TILE_SIZE = 16 * SCALE
    const DINO_WIDTH = 24 * SCALE
    const DINO_HEIGHT = 24 * SCALE
    const canvasWidth = CANVAS_WIDTH
    const canvasHeight = CANVAS_HEIGHT

    const tileset = new Image()
    tileset.src = '/games/dino-fight/images/tileset.png'

    const background = new Image()
    background.src = '/games/dino-run/images/skybackground.png'

    const dashSprite = new Image()
    dashSprite.src = `/games/dino-fight/sprites/dino${dinoId}/dash.png`

    const jumpSprite = new Image()
    jumpSprite.src = `/games/dino-fight/sprites/dino${dinoId}/jump.png`

    const coinImage = new Image()
    coinImage.src = '/games/dino-run/images/suitch-coin.png'

    const dashFrameCount = 6
    const jumpFrameCount = 4
    let dashFrames: HTMLCanvasElement[] = []
    let jumpFrames: HTMLCanvasElement[] = []

    let coinsCollected = 0
    let gameOver = false

    const extractFrames = (sprite: HTMLImageElement, frameCount: number, frameWidth: number, frameHeight: number) => {
      const frames = []
      for (let i = 0; i < frameCount; i++) {
        const offscreen = document.createElement('canvas')
        offscreen.width = frameWidth
        offscreen.height = frameHeight
        const offCtx = offscreen.getContext('2d')!
        offCtx.imageSmoothingEnabled = false
        offCtx.drawImage(sprite, i * frameWidth, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight)
        frames.push(offscreen)
      }
      return frames
    }

    const getNextTile = () => {
      const groundTileIndices = [0, 2, 4]
      if (Math.random() < 0.1) return -1 // 10% chance gap
      const idx = groundTileIndices[Math.floor(Math.random() * groundTileIndices.length)]
      return idx * 16
    }

    const maxGapTiles = 3

    const generateTiles = (): number[] => {
      const minGapWidth = DINO_WIDTH / 2
      const tilesCount = 100
      const tiles: number[] = []

      let i = 0
      const groundTileIndices = [0, 2, 4]

      // Generate first 30 tiles with solid ground
      while (i < 30 && i < tilesCount) {
        const idx = groundTileIndices[Math.floor(Math.random() * groundTileIndices.length)]
        tiles[i] = idx * 16
        i++
      }

      // After initial solid ground, alternate runs and gaps until tilesCount is reached
      while (i < tilesCount) {
        // Generate run of ground tiles
        const runLength = Math.min(Math.floor(Math.random() * 11) + 5, tilesCount - i)
        for (let r = 0; r < runLength; r++) {
          const idx = groundTileIndices[Math.floor(Math.random() * groundTileIndices.length)]
          tiles[i++] = idx * 16
        }

        if (i >= tilesCount) break

        // Generate gap of limited size
        const gapTiles = Math.min(
          maxGapTiles,
          tilesCount - i,
          1 + Math.floor(Math.random() * maxGapTiles)
        )
        for (let g = 0; g < gapTiles; g++) {
          tiles[i++] = -1
        }
      }

      return tiles
    }


    let tiles = generateTiles()

    let offsetX = 0
    let bgOffset = 0
    let dinoX = 100
    let dinoY = canvasHeight - TILE_SIZE - DINO_HEIGHT
    let velocityY = 0
    const gravity = 0.5 * SCALE
    const jumpStrength = -10 * SCALE
    let isJumping = false

    let frame = 0
    let frameTimer = 0
    const frameDelay = 6
    let started = false

    let platforms: Platform[] = []
    let coins: Coin[] = []
    const PLATFORM_TILE_SX = 0
    const PLATFORM_TILE_SY = 0
    let platformSpawnTimer = 0
    const PLATFORM_SPAWN_INTERVAL = 120

    const baseSpeed = 2 * SCALE
    let currentSpeed = baseSpeed

    const spawnPlatform = () => {
      const tileCount = Math.floor(Math.random() * 3) + 2
      const y = canvasHeight - TILE_SIZE * (Math.floor(Math.random() * 3) + 3)
      const x = canvasWidth + Math.random() * (canvasWidth / 2)
      platforms.push({ x, y, tiles: tileCount })

      if (Math.random() < 0.7) {
        const coinX = x + Math.floor(Math.random() * tileCount) * TILE_SIZE + TILE_SIZE / 4
        const coinY = y - TILE_SIZE - 10
        coins.push({ x: coinX, y: coinY, collected: false })
      }
    }

    const handleJump = () => {
      if (!isJumping && !gameOver) {
        velocityY = jumpStrength
        isJumping = true
        frame = 0
        frameTimer = 0
      }
    }

    const restartGame = () => {
      gameOver = false
      coinsCollected = 0
      coins = []
      platforms = []
      tiles = generateTiles()
      offsetX = 0
      bgOffset = 0
      dinoY = canvasHeight - TILE_SIZE - DINO_HEIGHT
      velocityY = 0
      isJumping = false
      platformSpawnTimer = 0
      frame = 0
      frameTimer = 0
      started = true
      loop()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (gameOver) {
          restartGame()
        } else {
          handleJump()
        }
      }
    }

    const onTouchStart = () => {
      if (gameOver) {
        restartGame()
      } else {
        handleJump()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart)

    const onGamepadMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; button?: string; action?: string }
      if (data.type === 'ACTION' && data.button === 'A' && data.action === 'start') {
        if (gameOver) restartGame()
        else handleJump()
      }
    }
    window.addEventListener('message', onGamepadMessage)

    const tryStart = () => {
      if (
        tileset.complete &&
        background.complete &&
        dashSprite.complete &&
        jumpSprite.complete &&
        coinImage.complete &&
        !started
      ) {
        dashFrames = extractFrames(dashSprite, dashFrameCount, 24, 24)
        jumpFrames = extractFrames(jumpSprite, jumpFrameCount, 24, 24)
        started = true
        loop()
      }
    }

    tileset.onload = tryStart
    background.onload = tryStart
    dashSprite.onload = tryStart
    jumpSprite.onload = tryStart
    coinImage.onload = tryStart

    const loop = () => {
      if (gameOver) {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = 'white'
        ctx.font = '48px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Game Over!', canvasWidth / 2, canvasHeight / 2 - 60)

        // Draw coin icon + count below Game Over text
        const coinSize = TILE_SIZE
        const coinX = (canvasWidth / 2) - (coinSize / 2) - 30
        const coinY = canvasHeight / 2 - 20

        ctx.drawImage(coinImage, coinX, coinY, coinSize, coinSize)

        const text = `x ${coinsCollected}`
        ctx.font = '24px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(text, coinX + coinSize + 10, coinY + coinSize * 0.75)

        // Draw restart button rectangle
        const buttonWidth = 200
        const buttonHeight = 50
        const buttonX = (canvasWidth - buttonWidth) / 2
        const buttonY = (canvasHeight / 2) + 40

        ctx.fillStyle = '#222'
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight)

        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight)

        ctx.fillStyle = 'white'
        ctx.font = '24px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Restart', canvasWidth / 2, buttonY + buttonHeight / 2 + 8)

        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update speed every 10 coins
      currentSpeed = baseSpeed + Math.floor(coinsCollected / 10) * 0.5 * SCALE

      // Background scroll
      const bgScrollSpeed = 0.5 * SCALE
      const bgWidth = background.width
      bgOffset -= bgScrollSpeed
      const bgX = Math.floor(bgOffset % bgWidth)
      for (let i = -1; i <= Math.ceil(canvas.width / bgWidth); i++) {
        ctx.drawImage(background, bgX + i * bgWidth, 0, bgWidth, canvas.height)
      }

      // Ground scroll and generation
      offsetX -= currentSpeed
      if (offsetX <= -TILE_SIZE) {
        offsetX += TILE_SIZE
        tiles.shift()
        tiles.push(getNextTile())
      }

      const groundY = canvas.height - TILE_SIZE
      for (let i = 0; i < tiles.length; i++) {
        const sx = tiles[i]
        if (sx === -1) continue // skip gap
        const dx = Math.floor(i * TILE_SIZE + offsetX)
        ctx.drawImage(tileset, sx, 0, 16, 16, dx, groundY, TILE_SIZE, TILE_SIZE)
      }

      // Spawn platforms
      platformSpawnTimer++
      if (platformSpawnTimer >= PLATFORM_SPAWN_INTERVAL) {
        spawnPlatform()
        platformSpawnTimer = 0
      }

      // Update & draw platforms
      platforms.forEach(p => {
        p.x -= currentSpeed
        for (let i = 0; i < p.tiles; i++) {
          ctx.drawImage(
            tileset,
            PLATFORM_TILE_SX, PLATFORM_TILE_SY, 16, 16,
            Math.floor(p.x + i * TILE_SIZE),
            Math.floor(p.y),
            TILE_SIZE,
            TILE_SIZE
          )
        }
      })

      // Remove offscreen platforms
      platforms = platforms.filter(p => p.x + p.tiles * TILE_SIZE > -TILE_SIZE).slice(-10)

      // Update & draw coins
      coins.forEach(coin => {
        coin.x -= currentSpeed
        if (!coin.collected) {
          ctx.drawImage(coinImage, coin.x, coin.y, TILE_SIZE, TILE_SIZE)

          const overlap =
            dinoX + DINO_WIDTH > coin.x &&
            dinoX < coin.x + TILE_SIZE &&
            dinoY + DINO_HEIGHT > coin.y &&
            dinoY < coin.y + TILE_SIZE

          if (overlap) {
            coin.collected = true
            coinsCollected++
          }
        }
      })

      coins = coins.filter(c => c.x > -TILE_SIZE && !c.collected)

      // Gravity & movement
      velocityY += gravity
      dinoY += velocityY

      // Ground collision with gaps check preventing standing on mini gaps
      const floorY = canvasHeight - TILE_SIZE - DINO_HEIGHT
      const dinoLeftIndex = Math.floor((-offsetX + dinoX) / TILE_SIZE)
      const dinoRightIndex = Math.floor((-offsetX + dinoX + DINO_WIDTH) / TILE_SIZE)

      const isGroundUnderDino = (() => {
        const leniency = 2 // pixels of leniency on edges while jumping

        for (let i = dinoLeftIndex; i <= dinoRightIndex; i++) {
          if (tiles[i] === -1) {
            if (!isJumping) return false // no leniency when running

            // Check leniency on edges when jumping
            const dinoLeftPos = (-offsetX + dinoX)
            const dinoRightPos = (-offsetX + dinoX + DINO_WIDTH)

            // Left edge leniency check
            if (tiles[i] === -1 && i === dinoLeftIndex) {
              const tileRightEdge = i * TILE_SIZE
              if (dinoLeftPos - tileRightEdge >= -leniency && dinoLeftPos - tileRightEdge <= 0) {
                continue // allow leniency on left edge
              } else {
                return false
              }
            }

            // Right edge leniency check
            if (tiles[i] === -1 && i === dinoRightIndex) {
              const tileLeftEdge = (i + 1) * TILE_SIZE
              if (tileLeftEdge - dinoRightPos >= -leniency && tileLeftEdge - dinoRightPos <= 0) {
                continue // allow leniency on right edge
              } else {
                return false
              }
            }

            // If gap tile in middle, no leniency
            if (i !== dinoLeftIndex && i !== dinoRightIndex) {
              return false
            }
          }
        }
        return true
      })()

      if (isGroundUnderDino) {
        if (dinoY >= floorY) {
          dinoY = floorY
          velocityY = 0
          isJumping = false
        }
      } else {
        // Let dino fall if gap underfoot
        if (dinoY > canvasHeight + 50) {
          gameOver = true
        }
      }

      // Platform collisions
      for (const platform of platforms) {
        const platTop = platform.y
        const platBottom = platform.y + TILE_SIZE
        const platLeft = platform.x
        const platRight = platform.x + platform.tiles * TILE_SIZE

        const onPlatform =
          dinoX + DINO_WIDTH > platLeft &&
          dinoX < platRight &&
          dinoY + DINO_HEIGHT >= platTop &&
          dinoY + DINO_HEIGHT <= platBottom &&
          velocityY >= 0

        const hitPlatformBottom =
          dinoX + DINO_WIDTH > platLeft &&
          dinoX < platRight &&
          dinoY <= platBottom + 5 &&
          dinoY >= platTop - 5 &&
          velocityY < 0

        if (onPlatform) {
          dinoY = platTop - DINO_HEIGHT
          velocityY = 0
          isJumping = false
        } else if (hitPlatformBottom) {
          velocityY = 0
          dinoY = platBottom
        }
      }

      // Animate dino frames
      frameTimer++
      if (frameTimer >= frameDelay) {
        frameTimer = 0
        frame = (frame + 1) % (isJumping ? jumpFrameCount : dashFrameCount)
      }

      const currentFrame = isJumping ? jumpFrames[frame] : dashFrames[frame]
      ctx.drawImage(currentFrame, Math.floor(dinoX), Math.floor(dinoY), DINO_WIDTH, DINO_HEIGHT)

      // Draw coin counter UI
      const coinUIY = 20

      const text = `x ${coinsCollected}`
      ctx.font = `${12 * SCALE}px monospace`
      const textWidth = ctx.measureText(text).width
      const counterWidth = TILE_SIZE + 30 + textWidth

      // Adjust X to keep entire counter visible inside canvas, with 10px padding
      const coinUIX = canvasWidth - counterWidth - 10

      // Adjust these offsets for better alignment:
      const coinImageOffsetX = 3 // shift coin image slightly right
      const coinImageOffsetY = 4 // shift coin image slightly down

      const textOffsetX = 8 // shift text slightly right for spacing
      const textOffsetY = TILE_SIZE * 0.85 // slight vertical adjustment for text baseline

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(coinUIX - 6, coinUIY - 4, counterWidth, TILE_SIZE + 10)

      ctx.drawImage(coinImage, coinUIX + coinImageOffsetX, coinUIY + coinImageOffsetY, TILE_SIZE, TILE_SIZE)
      ctx.fillStyle = 'white'
      ctx.fillText(text, coinUIX + TILE_SIZE + textOffsetX, coinUIY + textOffsetY)

      requestAnimationFrame(loop)
    }

    // Handle click to restart if game over
    const onClick = (e: MouseEvent) => {
      if (!gameOver) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const buttonWidth = 200
      const buttonHeight = 50
      const buttonX = (canvasWidth - buttonWidth) / 2
      const buttonY = (canvasHeight / 2) + 20

      if (
        mouseX >= buttonX &&
        mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY &&
        mouseY <= buttonY + buttonHeight
      ) {
        // Reset all game variables to restart
        gameOver = false
        coinsCollected = 0
        tiles = generateTiles()
        offsetX = 0
        bgOffset = 0
        dinoY = canvasHeight - TILE_SIZE - DINO_HEIGHT
        velocityY = 0
        isJumping = false
        platforms = []
        coins = []
        platformSpawnTimer = 0
        frame = 0
        frameTimer = 0
        started = true
        loop()
      }
    }

    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('resize', resizeCanvasCSS)
      window.removeEventListener('message', onGamepadMessage)
    }
  }, [dinoId])

  return (
    <div className="flex justify-center items-center min-h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ imageRendering: 'pixelated', border: '2px solid white' }}
      />
    </div>
  )
}
