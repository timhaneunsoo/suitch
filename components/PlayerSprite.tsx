'use client'

import { memo } from 'react'
import { useGlobalSpriteCache } from '@/utils/useGlobalSpriteCache'

const TILE_SIZE = 32

const PlayerSprite = ({
  x,
  y,
  spriteName,
  folder,
  frame,
  isLocal = false,
  style = {},
}: {
  x: number
  y: number
  spriteName: string
  folder: string
  frame: number
  isLocal?: boolean
  style?: React.CSSProperties
}) => {
  const { sprites, loaded } = useGlobalSpriteCache()

  if (!loaded) return null

  const clampedFrame = Math.max(1, Math.min(frame, 8))
  const key = `/sprites/${spriteName}/${folder}/${folder}_${clampedFrame}.png`
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
        zIndex: 1000 + Math.floor(y) + (isLocal ? 10 : 0), // Local player appears above remotes
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        willChange: 'transform',
        ...style,
      }}
    />
  )
}

export default memo(PlayerSprite)
