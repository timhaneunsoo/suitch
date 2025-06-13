'use client'

import { useEffect, useRef, useState, memo } from 'react'
import { db } from '@/utils/firebase'
import { ref, update } from 'firebase/database'
import { useGlobalSpriteCache } from '@/utils/useGlobalSpriteCache'

const TILE_SIZE = 32
const STEP_SIZE = TILE_SIZE * 0.5
const FRAME_COUNT = 8
const MOVE_SPEED = 4
const IDLE_FRAME_DELAY = 75
const FIREBASE_UPDATE_INTERVAL = 150
const REMOTE_ANIMATION_DURATION = 200 // ms

type Direction = 'front' | 'back' | 'left' | 'right' | 'idle'

interface PlayerProps {
  spriteName: string
  playerName: string
  x: number
  y: number
  setX: (val: number) => void
  setY: (val: number) => void
  mapWidth: number
  mapHeight: number
  collisionSet: Set<string>
  setPixelX?: (val: number) => void
  setPixelY?: (val: number) => void
  message?: { text: string; timestamp: number } | null
  dir?: Direction
  frame?: number
  isRemote?: boolean
}

const PlayerName = memo(({ x, y, name }: { x: number; y: number; name: string }) => (
  <div
    className="absolute flex justify-center items-center text-white text-xs"
    style={{
      top: y - TILE_SIZE * 1.5,
      left: x,
      transform: 'translate(-50%,-100%)',
      zIndex: 2000,
      willChange: 'transform',
      backfaceVisibility: 'hidden',
    }}
  >
    <div className="bg-black bg-opacity-70 px-2 py-1 rounded-full">{name}</div>
  </div>
))

const PlayerMessage = memo(({ x, y, text }: { x: number; y: number; text: string }) => (
  <div
    className="absolute text-white text-xs px-3 py-2 rounded bg-black bg-opacity-80"
    style={{
      top: y - TILE_SIZE * 2.5,
      left: x,
      transform: 'translate(-50%,-100%)',
      zIndex: 2500,
      willChange: 'transform',
      backfaceVisibility: 'hidden',
    }}
  >
    {text}
  </div>
))

const PlayerSprite = memo(({ x, y, spriteName, folder, frame }: { x: number; y: number; spriteName: string; folder: string; frame: number }) => {
  const { sprites } = useGlobalSpriteCache()
  const key = `/sprites/${spriteName}/${folder}/${folder}_${frame}.png`
  const sprite = sprites[key]

  if (!sprite) return null

  return (
    <img
      src={sprite.src}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        top: y,
        left: x,
        width: TILE_SIZE,
        height: TILE_SIZE,
        transform: 'translate3d(-50%, -100%, 0)',
        zIndex: 1000 + Math.floor(y),
        imageRendering: 'pixelated',
        willChange: 'transform',
        pointerEvents: 'none',
        backfaceVisibility: 'hidden',
      }}
    />
  )
})


function Player({
  spriteName,
  playerName,
  x,
  y,
  setX,
  setY,
  mapWidth,
  mapHeight,
  collisionSet,
  setPixelX,
  setPixelY,
  message,
  dir: dirProp,
  frame: frameProp,
  isRemote = false,
}: PlayerProps) {
  const [dir, setDir] = useState<Direction>('idle')
  const [frame, setFrame] = useState(1)
  const [posX, setPosX] = useState(x * TILE_SIZE)
  const [posY, setPosY] = useState(y * TILE_SIZE)
  const { loaded: spritesLoaded } = useGlobalSpriteCache()

  const targetX = useRef(x * TILE_SIZE)
  const targetY = useRef(y * TILE_SIZE)
  const currentPos = useRef({ x: x * TILE_SIZE, y: y * TILE_SIZE })
  const moving = useRef(false)
  const keysHeld = useRef(new Set<string>())
  const remoteQueue = useRef<{ x: number; y: number; dir: Direction }[]>([])
  const playerId = useRef<string>(typeof window !== 'undefined' ? window.localStorage.getItem('playerId') || Math.random().toString(36).substring(2, 10) : '')
  const lastSent = useRef(Date.now())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('playerId', playerId.current)
    }
  }, [])

  useEffect(() => {
    setPixelX?.(posX)
    setPixelY?.(posY)
  }, [posX, posY])

useEffect(() => {
    if (!isRemote) return

    const targetX = x * TILE_SIZE
    const targetY = y * TILE_SIZE
    
    // Si pas de mouvement, pas d'animation
    if (Math.abs(posX - targetX) < 2 && Math.abs(posY - targetY) < 2) {
      setPosX(targetX)
      setPosY(targetY)
      setDir(dirProp || 'idle')
      return
    }

    let rafId: number
    const startTime = performance.now()
    const startX = posX
    const startY = posY
    const duration = 200
    
    // KEEP THE CURRENT FRAME
    let currentFrame = frame

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const newX = startX + (targetX - startX) * progress
      const newY = startY + (targetY - startY) * progress
      
      setPosX(newX)
      setPosY(newY)
      setDir(dirProp || 'idle')
      
      // Continue frame and no reset
      if (Math.floor(now / 100) !== Math.floor((now - 16) / 100)) {
        currentFrame = (currentFrame % FRAME_COUNT) + 1
        setFrame(currentFrame)
      }
      
      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }
    
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [x, y, dirProp, isRemote, frame])

  useEffect(() => {
    if (isRemote) return
    let rafId: number

    const animate = () => {
      if (moving.current) {
        const dx = targetX.current - posX
        const dy = targetY.current - posY
        const dist = Math.hypot(dx, dy)

        if (dist < MOVE_SPEED) {
          setPosX(targetX.current)
          setPosY(targetY.current)
          moving.current = false
          const still = ['ArrowUp','w','ArrowDown','s','ArrowLeft','a','ArrowRight','d'].some(k => keysHeld.current.has(k))
          const nd = still ? dir : 'idle'
          setDir(nd)
          setFrame(1)
          update(ref(db, `players/${playerId.current}`), {
            spriteName,
            playerName,
            x: targetX.current / TILE_SIZE,
            y: targetY.current / TILE_SIZE,
            timestamp: Date.now(),
            dir: nd,
            frame: 1,
          })
        } else {
          const ang = Math.atan2(dy, dx)
          const nx = posX + Math.cos(ang) * MOVE_SPEED
          const ny = posY + Math.sin(ang) * MOVE_SPEED
          setPosX(nx)
          setPosY(ny)
          setFrame(p => (p % FRAME_COUNT) + 1)
          if (Date.now() - lastSent.current > FIREBASE_UPDATE_INTERVAL) {
            update(ref(db, `players/${playerId.current}`), {
              spriteName,
              playerName,
              x: nx / TILE_SIZE,
              y: ny / TILE_SIZE,
              timestamp: Date.now(),
              dir,
              frame,
            })
            lastSent.current = Date.now()
          }
        }
      }
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [posX, posY, dir])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName||'')) return
      keysHeld.current.add(e.key)
    }
    const up = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName||'')) return
      keysHeld.current.delete(e.key)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)

    const loop = setInterval(() => {
      if (moving.current || isRemote) return
      let dx = 0, dy = 0
      let nd: Direction = 'idle'
      if (keysHeld.current.has('ArrowUp')||keysHeld.current.has('w')) { dy = -STEP_SIZE; nd = 'back' }
      else if (keysHeld.current.has('ArrowDown')||keysHeld.current.has('s')) { dy = STEP_SIZE; nd = 'front' }
      else if (keysHeld.current.has('ArrowLeft')||keysHeld.current.has('a')) { dx = -STEP_SIZE; nd = 'left' }
      else if (keysHeld.current.has('ArrowRight')||keysHeld.current.has('d')) { dx = STEP_SIZE; nd = 'right' }
      else return

      const fx = posX + dx
      const fy = posY + dy
      const tX = parseFloat((fx/TILE_SIZE).toFixed(1))
      const tY = parseFloat((fy/TILE_SIZE).toFixed(1))
      const key = `${Math.round(tX * 10) / 10},${Math.round(tY * 10) / 10}`
      if (tX>=0&&tX<mapWidth&&tY>=0&&tY<mapHeight&&!collisionSet.has(key)) {
        targetX.current = fx
        targetY.current = fy
        moving.current = true
        setDir(nd)
        setX(tX)
        setY(tY)
      }
    }, 50)

    return () => {
      clearInterval(loop)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [posX, mapWidth, mapHeight, collisionSet, isRemote])

useEffect(() => {
    if (!isRemote) return
    
    const iv = setInterval(() => {
      if ((dirProp ?? 'idle') === 'idle') {
        setFrame(p => (p % FRAME_COUNT) + 1)
      }
    }, IDLE_FRAME_DELAY)
    
    return () => clearInterval(iv)
  }, [dirProp, isRemote])

  const [lastNonIdleDir, setLastNonIdleDir] = useState<Direction>('front')

  useEffect(() => {
    if (!isRemote) return
    if (dirProp && dirProp !== 'idle') {
      setLastNonIdleDir(dirProp)
    }
  }, [dirProp])

  const actualDir = isRemote
    ? dirProp === 'idle' ? lastNonIdleDir : dirProp ?? lastNonIdleDir
    : dir

  const actualFrame = frame ?? 1
  const folder = actualDir === 'idle' ? 'idle' : `${actualDir}Walk`

  return (
    <>
      <PlayerName x={posX} y={posY} name={playerName} />
      {message && <PlayerMessage x={posX} y={posY} text={message.text} />}
      {spritesLoaded && <PlayerSprite x={posX} y={posY} spriteName={spriteName} folder={folder} frame={actualFrame} />}
    </>
  )
}

export default memo(Player)
