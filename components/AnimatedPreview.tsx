'use client'
import { useEffect, useState } from "react"

interface AnimatedPreviewProps {
  character: string
}

const TILE_SIZE = 32
const FRAME_COUNT = 8
const DELAY = 200 // ms

export default function AnimatedPreview({ character }: AnimatedPreviewProps) {
  const [frame, setFrame] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => (prev % FRAME_COUNT) + 1)
    }, DELAY)
    return () => clearInterval(interval)
  }, [])

  const backgroundPosition = `-${(frame - 1) * TILE_SIZE}px 0px`

  return (
    <div
      className="w-8 h-8"
      style={{
        backgroundImage: `url(/sprites/${character}/idle.png)`,
        backgroundSize: `${FRAME_COUNT * TILE_SIZE}px ${TILE_SIZE}px`,
        backgroundPosition,
        imageRendering: 'pixelated',
      }}
    />
  )
}
