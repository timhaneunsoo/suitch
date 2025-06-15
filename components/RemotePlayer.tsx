'use client'

import { useEffect, useRef, useState, memo } from 'react'
import { useGlobalSpriteCache } from '@/utils/useGlobalSpriteCache'

const TILE_SIZE = 32
const FRAME_COUNT = 8
const IDLE_FRAME_INTERVAL = 400
const MOVE_STEPS = 6

// Types

type Direction = 'front' | 'back' | 'left' | 'right' | 'idle'

interface RemotePlayerProps {
  spriteName: string
  playerName: string
  x: number
  y: number
  message?: { text: string; timestamp: number } | null
}

function RemotePlayer({
  spriteName,
  playerName,
  x,
  y,
  message
}: RemotePlayerProps) {
  const { sprites } = useGlobalSpriteCache()
  const [posX, setPosX] = useState(x * TILE_SIZE)
  const [posY, setPosY] = useState(y * TILE_SIZE)
  const [animFrame, setAnimFrame] = useState(1)
  const [dir, setDir] = useState<Direction>('idle')

  const prevX = useRef(x)
  const prevY = useRef(y)
  const idleIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMoveTime = useRef(Date.now())

  useEffect(() => {
    let newDir: Direction = 'idle'
    if (x > prevX.current) newDir = 'right'
    else if (x < prevX.current) newDir = 'left'
    else if (y > prevY.current) newDir = 'front'
    else if (y < prevY.current) newDir = 'back'

    if (x !== prevX.current || y !== prevY.current) {
      lastMoveTime.current = Date.now()
      if (newDir !== 'idle') {
        setDir(newDir)
      }
      prevX.current = x
      prevY.current = y
    }
  }, [x, y])

  useEffect(() => {
    const idleCheck = setInterval(() => {
      if (Date.now() - lastMoveTime.current > 500) {
        setDir('idle')
      }
    }, 200)
    return () => clearInterval(idleCheck)
  }, [])

  useEffect(() => {
    const targetX = x * TILE_SIZE
    const targetY = y * TILE_SIZE
    const startX = posX
    const startY = posY
    const stepX = (targetX - startX) / MOVE_STEPS
    const stepY = (targetY - startY) / MOVE_STEPS

    let currentStep = 0

    if (idleIntervalRef.current) {
      clearInterval(idleIntervalRef.current)
      idleIntervalRef.current = null
    }

    const moveInterval = setInterval(() => {
      currentStep++
      setPosX(startX + stepX * currentStep)
      setPosY(startY + stepY * currentStep)
      setAnimFrame((prev) => (prev % FRAME_COUNT) + 1)

      if (currentStep >= MOVE_STEPS) {
        clearInterval(moveInterval)
        setPosX(targetX)
        setPosY(targetY)
        setAnimFrame(1)

        if (dir === 'idle') {
          idleIntervalRef.current = setInterval(() => {
            setAnimFrame((prev) => (prev % FRAME_COUNT) + 1)
          }, IDLE_FRAME_INTERVAL)
        }
      }
    }, 50)

    return () => clearInterval(moveInterval)
  }, [x, y, dir])

  const folder = dir === 'idle' ? 'idle' : `${dir}Walk`
  const key = `/sprites/${spriteName.toLowerCase()}/${folder}/${folder}_${animFrame}.png`
  const sprite = sprites[key]

  const zIndex = 1000 + Math.floor(posY)

  return (
    <>
      {message && (
        <div
          className="absolute text-white text-[7px] leading-snug px-1.5 py-1 rounded-md bg-black bg-opacity-80"
          style={{
            top: posY - TILE_SIZE * 1.4,
            left: posX,
            transform: 'translate(-50%, -100%)',
            zIndex,
            maxWidth: 90,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            lineHeight: '1.1',
          }}
        >
          {message.text}
        </div>
      )}

      {sprite && (
        <img
          src={sprite.src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            top: posY,
            left: posX,
            width: TILE_SIZE,
            height: TILE_SIZE,
            transform: 'translate(-50%, -100%)',
            imageRendering: 'pixelated',
            zIndex,
            pointerEvents: 'none'
          }}
        />
      )}

      <div
        className="absolute flex justify-center items-center text-white text-[7px] leading-none"
        style={{
          top: posY + TILE_SIZE * 0.25,
          left: posX,
          transform: 'translate(-50%, 0)',
          zIndex,
        }}
      >
        <div className="bg-black bg-opacity-70 px-1.5 py-0.5 rounded-full">{playerName}</div>
      </div>
    </>
  )
}

export default memo(RemotePlayer)
