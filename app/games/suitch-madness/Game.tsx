'use client'

import { useEffect, useRef, useState } from 'react'
import { db } from '@/utils/firebase'
import { ref, onValue, set, update, remove } from 'firebase/database'
import PlatformerGrid from './Grid'
import usePlayerInfo from '@/utils/usePlayerInfo'
import { generateItems, generateMap } from './Logic'
import { useRouter } from 'next/navigation'

const GRID_WIDTH = 20
const GRID_HEIGHT = 12
const TILE_SIZE = 32
const GRAVITY = 0.6
const JUMP_FORCE = -3
const MAX_FALL_SPEED = 4
const GAME_DURATION = 60000

export default function SuitchGame() {
  const { playerId, playerName, spriteName } = usePlayerInfo()
  const [players, setPlayers] = useState<Record<string, any>>({})
  const [items, setItems] = useState<Record<string, any>>({})
  const [map, setMap] = useState<number[][]>([])
  const [gameOver, setGameOver] = useState(false)
  const router = useRouter()
  const playerRef = useRef<any>(null)

  // Register player
  useEffect(() => {
    const initialMap = generateMap(GRID_WIDTH, GRID_HEIGHT)
    setMap(initialMap)

    const player = {
      x: 1,
      y: GRID_HEIGHT - 2,
      velY: 0,
      score: 0,
      name: playerName,
      sprite: spriteName,
    }

    const refPath = ref(db, `suitch-madness/players/${playerId}`)
    playerRef.current = refPath
    set(refPath, player)

    return () => {
      remove(refPath)
    }
  }, [playerId, playerName, spriteName])

  // Listen for players
  useEffect(() => {
    return onValue(ref(db, 'suitch-madness/players'), snap => {
      setPlayers(snap.val() || {})
    })
  }, [])

  // Listen for items
  useEffect(() => {
    return onValue(ref(db, 'suitch-madness/items'), snap => {
      setItems(snap.val() || {})
    })
  }, [])

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const player = players[playerId]
      if (!player || gameOver || !map.length) return

      let { x, y, velY, score } = player

      if (
        (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') &&
        x > 0 &&
        map[Math.floor(y)]?.[x - 1] !== 1
      ) {
        x -= 1
      }

      if (
        (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') &&
        x < GRID_WIDTH - 1 &&
        map[Math.floor(y)]?.[x + 1] !== 1
      ) {
        x += 1
      }

      const canJump =
        Math.floor(y + 1) < GRID_HEIGHT &&
        map[Math.floor(y + 1)]?.[x] === 1 &&
        velY === 0

      if (
        (e.key === 'ArrowUp' ||
          e.key.toLowerCase() === 'w' ||
          e.key === ' ') &&
        canJump
      ) {
        velY = JUMP_FORCE
      }

      const key = `${x}_${Math.floor(y)}`
      if (items[key]) {
        score += items[key].type === 'golden' ? 3 : 1
        remove(ref(db, `suitch-madness/items/${key}`))
      }

      update(playerRef.current, { x, velY, score })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [players, gameOver, playerId, items, map])

  // Gravity
  useEffect(() => {
    const interval = setInterval(() => {
      const player = players[playerId]
      if (!player || gameOver || !map.length) return

      let { x, y, velY = 0 } = player

      velY += GRAVITY
      velY = Math.min(velY, MAX_FALL_SPEED)

      let nextY = y + velY
      const tileBelowY = Math.floor(nextY + 0.8)
      const tileBelow = map[tileBelowY]?.[x]

      // Landing logic
      if (tileBelow === 1) {
        nextY = tileBelowY - 1
        velY = 0
      }

      // Ceiling collision
      if (velY < 0 && map[Math.floor(nextY)]?.[x] === 1) {
        velY = 0
      }

      update(playerRef.current, { y: nextY, velY })
    }, 50)

    return () => clearInterval(interval)
  }, [players, gameOver, playerId, map])

  // Spawn items
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver || !map.length) return
      const newItems = generateItems(players, map, items)
      for (const key in newItems) {
        set(ref(db, `suitch-madness/items/${key}`), newItems[key])
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [players, gameOver, map])

  // Game timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setGameOver(true)
    }, GAME_DURATION)

    return () => clearTimeout(timer)
  }, [])

  const handleReturnToLobby = async () => {
    await remove(playerRef.current)
    await update(ref(db, 'suitch-madness/lobby'), { started: false })
    router.push('/games/suitch-madness/lobby')
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <PlatformerGrid
        gridWidth={GRID_WIDTH}
        gridHeight={GRID_HEIGHT}
        tileSize={TILE_SIZE}
        players={players}
        items={items}
        map={map}
      />
      {gameOver && (
        <div className="text-center mt-4">
          <h2 className="text-xl font-bold text-pink-500">Game Over!</h2>
          <ul className="mt-2 text-sm mb-4">
            {Object.entries(players)
              .sort(([, a], [, b]) => b.score - a.score)
              .map(([id, p]) => (
                <li key={id}>
                  {p.name || 'Player'}: {p.score}
                </li>
              ))}
          </ul>
          <button
            onClick={handleReturnToLobby}
            className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700 transition"
          >
            🔁 Return to Lobby
          </button>
        </div>
      )}
    </div>
  )
}
