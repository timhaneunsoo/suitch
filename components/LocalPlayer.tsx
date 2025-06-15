'use client'

import { useEffect, useRef, useState } from 'react'
import { db } from '@/utils/firebase'
import { ref, update } from 'firebase/database'
import PlayerSprite from './PlayerSprite'

const TILE_SIZE = 32
const STEP_SIZE = TILE_SIZE * 0.1
const FRAME_COUNT = 8
const FIREBASE_UPDATE_INTERVAL = 120
const IDLE_FRAME_INTERVAL = 250

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
}

export default function LocalPlayer({
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
}: PlayerProps) {
  const [dir, setDir] = useState<Direction>('idle')
  const [frame, setFrame] = useState(1)
  const [renderX, setRenderX] = useState(x * TILE_SIZE)
  const [renderY, setRenderY] = useState(y * TILE_SIZE)

  const pixelXRef = useRef(x * TILE_SIZE)
  const pixelYRef = useRef(y * TILE_SIZE)
  const keysHeld = useRef<Set<string>>(new Set())
  const lastSent = useRef(0)
  const lastSentState = useRef<string>('')
  const playerId = useRef<string>('')

  useEffect(() => {
    let id = localStorage.getItem('playerId')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('playerId', id)
    }
    playerId.current = id
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      const isTyping =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable)

      if (!isTyping) {
        keysHeld.current.add(e.key)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.current.delete(e.key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    let animationFrame: number
    let lastIdleFrameTime = Date.now()

    const loop = () => {
      animationFrame = requestAnimationFrame(loop)

      let dx = 0
      let dy = 0
      let newDir: Direction = 'idle'

      if (keysHeld.current.has('ArrowUp') || keysHeld.current.has('w')) {
        dy = -STEP_SIZE
        newDir = 'back'
      } else if (keysHeld.current.has('ArrowDown') || keysHeld.current.has('s')) {
        dy = STEP_SIZE
        newDir = 'front'
      } else if (keysHeld.current.has('ArrowLeft') || keysHeld.current.has('a')) {
        dx = -STEP_SIZE
        newDir = 'left'
      } else if (keysHeld.current.has('ArrowRight') || keysHeld.current.has('d')) {
        dx = STEP_SIZE
        newDir = 'right'
      }

      const nx = pixelXRef.current + dx
      const ny = pixelYRef.current + dy
      const tileX = parseFloat((nx / TILE_SIZE).toFixed(1))
      const tileY = parseFloat((ny / TILE_SIZE).toFixed(1))

      const inBounds = tileX >= 0 && tileX < mapWidth && tileY >= 0 && tileY < mapHeight
      const collisionKey = `${tileX.toFixed(1)},${tileY.toFixed(1)}`
      const isBlocked = collisionSet.has(collisionKey)

      const shouldMove = dx !== 0 || dy !== 0

      if (shouldMove && inBounds && !isBlocked) {
        const nextFrame = frame >= FRAME_COUNT ? 1 : frame + 1
        setDir(newDir)
        setFrame(nextFrame)

        pixelXRef.current = nx
        pixelYRef.current = ny
        setRenderX(nx)
        setRenderY(ny)
        setX(tileX)
        setY(tileY)
        if (setPixelX) setPixelX(nx)
        if (setPixelY) setPixelY(ny)

        const stateKey = `${tileX},${tileY},${newDir},${nextFrame}`
        const now = Date.now()
        if (now - lastSent.current > FIREBASE_UPDATE_INTERVAL && stateKey !== lastSentState.current) {
          update(ref(db, `players/${playerId.current}`), {
            spriteName: spriteName.toLowerCase(),
            playerName,
            x: tileX,
            y: tileY,
            timestamp: now,
            dir: newDir,
            frame: nextFrame,
          })
          lastSent.current = now
          lastSentState.current = stateKey
        }
      } else {
        const now = Date.now()
        if (now - lastIdleFrameTime > IDLE_FRAME_INTERVAL) {
          lastIdleFrameTime = now
          const nextIdleFrame = frame >= FRAME_COUNT ? 1 : frame + 1
          setDir('idle')
          setFrame(nextIdleFrame)

          const idleKey = `${x},${y},idle,${nextIdleFrame}`
          if (idleKey !== lastSentState.current) {
            update(ref(db, `players/${playerId.current}`), {
              spriteName: spriteName.toLowerCase(),
              playerName,
              x,
              y,
              timestamp: now,
              dir: 'idle',
              frame: nextIdleFrame,
            })
            lastSent.current = now
            lastSentState.current = idleKey
          }
        }
      }
    }

    animationFrame = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      cancelAnimationFrame(animationFrame)
    }
  }, [frame])

  const spriteFolder = dir === 'idle' ? 'idle' : `${dir}Walk`

  return (
    <>
      {message && (
        <div
          className="absolute text-white text-[8px] leading-tight px-2 py-1 rounded-md bg-black bg-opacity-80 max-w-[120px] break-words whitespace-pre-wrap text-center"
          style={{
            top: renderY - TILE_SIZE * 1.2,
            left: renderX,
            transform: 'translate(-50%,-100%)',
            zIndex: 2500,
          }}
        >
          {message.text}
        </div>
      )}

      <PlayerSprite
        x={renderX}
        y={renderY}
        spriteName={spriteName.toLowerCase()}
        folder={spriteFolder}
        frame={Math.max(1, Math.min(frame, FRAME_COUNT))}
        isLocal={true}
      />

      <div
        className="absolute flex justify-center items-center text-white text-[8px] leading-none"
        style={{
          top: renderY + TILE_SIZE * 0.25,
          left: renderX,
          transform: 'translate(-50%, 0)',
          zIndex: 2000,
        }}
      >
        <div className="bg-black bg-opacity-70 px-1.5 py-0.5 rounded-full">{playerName}</div>
      </div>
    </>
  )
}
