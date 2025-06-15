// Full updated LoungeRoom.tsx with idle timeout fix (500ms)
'use client'
import { useEffect, useRef, useState } from 'react'
import LocalPlayer from './LocalPlayer'
import RemotePlayer from './RemotePlayer'
import { db } from '@/utils/firebase'
import { ref, onValue, set, onDisconnect, update } from 'firebase/database'
import { throttle } from 'lodash'
import { decor, DecorItem } from '@/utils/decor'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'

const TILE_SIZE = 32
const rows = 20
const cols = 25
const scale = 2
const WALL_HEIGHT = 3

interface LoungeRoomProps {
  spriteName?: string
  playerName?: string
}

const suitchZone = { x: 10.5, y: 2.5, w: 4, h: 4 }

export default function LoungeRoom({
  spriteName = 'Shib',
  playerName = 'Player',
}: LoungeRoomProps) {
  const [playerX, setPlayerX] = useState(Math.floor(cols / 2))
  const [playerY, setPlayerY] = useState(Math.floor(rows / 2))
  const [playerPixelX, setPlayerPixelX] = useState(playerX * TILE_SIZE)
  const [playerPixelY, setPlayerPixelY] = useState(playerY * TILE_SIZE)
  const [players, setPlayers] = useState<any[]>([])
  const [chat, setChat] = useState("")
  const [submittedMessage, setSubmittedMessage] = useState<{ text: string, timestamp: number } | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mobileMove, setMobileMove] = useState<string | null>(null)

  const mapRef = useRef<HTMLDivElement>(null)
  const playerId = useRef<string>(
    typeof window !== 'undefined'
      ? (() => {
          const existing = localStorage.getItem('playerId')
          if (existing) return existing
          const newId = Math.random().toString(36).substring(2, 10)
          localStorage.setItem('playerId', newId)
          return newId
        })()
      : ''
  )

  const collisionSet = new Set<string>()
  const added = new Set<string>()

  decor.forEach(({ x, y, w = 1, h = 1, collides }) => {
    if (collides) {
      const anchorX = x - w / 2
      const anchorY = y - h
      for (let dx = 0.0; dx < w; dx += 0.1) {
        for (let dy = 0.0; dy < h; dy += 0.1) {
          const tileX = +(anchorX + dx).toFixed(1)
          const tileY = +(anchorY + dy).toFixed(1)
          const key = `${tileX},${tileY}`
          if (!added.has(key)) {
            added.add(key)
            collisionSet.add(key)
          }
        }
      }
    }
  })

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < WALL_HEIGHT; y++) {
      for (let dx = 0.0; dx < 1.0; dx += 0.1) {
        for (let dy = 0.0; dy < 1.0; dy += 0.1) {
          const tileX = +(x + dx).toFixed(1)
          const tileY = +(y + dy).toFixed(1)
          const key = `${tileX},${tileY}`
          if (!added.has(key)) {
            added.add(key)
            collisionSet.add(key)
          }
        }
      }
    }
  }

  useEffect(() => {
    const px = playerPixelX / TILE_SIZE
    const py = playerPixelY / TILE_SIZE
    const nearSuitch =
      px >= suitchZone.x &&
      px < suitchZone.x + suitchZone.w &&
      py >= suitchZone.y &&
      py < suitchZone.y + suitchZone.h

    setShowLibrary(nearSuitch)
  }, [playerPixelX, playerPixelY])

useEffect(() => {
  const playersRef = ref(db, 'players')
  const seenMessages = new Map<string, { text: string; timestamp: number }>()

  const throttledUpdate = throttle((val: any) => {
    const now = Date.now()

    const updatedPlayers = Object.entries(val)
      .filter(([id]) => id !== playerId.current)
      .map(([id, data]: any) => {
        if (data.timestamp && now - data.timestamp > 5000) return null

        const existing = seenMessages.get(id)
        if (data.message && (!existing || existing.timestamp !== data.message.timestamp)) {
          seenMessages.set(id, data.message)
          setTimeout(() => {
            if (seenMessages.get(id)?.timestamp === data.message.timestamp) {
              seenMessages.set(id, null as any)
              setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, message: null } : p)))
            }
          }, 4000)
        }

        // Determine correct direction
        const prevPlayer = players.find((p) => p.id === id)
        const lastDir = prevPlayer?.dir && prevPlayer.dir !== 'idle' ? prevPlayer.dir : 'front'
        
        let dirToUse = data.dir
        let frameToUse = data.frame ?? 1

        if (data.dir === 'idle') {
          if (data.frame > 1) {
            // Force walking animation with last walk direction
            dirToUse = lastDir || 'front'
            frameToUse = data.frame
          } else {
            // Fully idle
            dirToUse = 'idle'
            frameToUse = 1
          }
        }

        console.log(`👤 Remote ${id} → dir: ${dirToUse}, frame: ${frameToUse}, lastDir: ${lastDir}, raw:`, data)

        return {
          id,
          ...data,
          message: seenMessages.get(id),
          dir: dirToUse,
          frame: frameToUse,
        }
      })
      .filter(Boolean)

    setPlayers((prevPlayers) => {
      // Only update if there are actual changes
      const hasChanges = updatedPlayers.some((newPlayer) => {
        const prev = prevPlayers.find((p) => p.id === newPlayer.id)
        return !prev || 
               prev.x !== newPlayer.x || 
               prev.y !== newPlayer.y || 
               prev.dir !== newPlayer.dir ||
               prev.timestamp !== newPlayer.timestamp
               prev.frame !== newPlayer.frame
      })
      
      if (!hasChanges && prevPlayers.length === updatedPlayers.length) {
        return prevPlayers // No changes, return same reference
      }
      
      return updatedPlayers.map((newPlayer) => {
        const prev = prevPlayers.find((p) => p.id === newPlayer.id)
        return { ...prev, ...newPlayer }
      })
    })
  }, 50) // Throttle Firebase updates to every 50ms

  onValue(playersRef, (snapshot) => {
    const val = snapshot.val() || {}

    throttledUpdate(val)
  })
}, [])

useEffect(() => {
  if (typeof window === 'undefined') return

  const playerRef = ref(db, `players/${playerId.current}`)

  // Automatically remove player from Firebase on disconnect
  onDisconnect(playerRef).remove()
}, [])

  return (
    <div className="w-full h-screen overflow-hidden bg-[#ffedd5] relative">
      <div
        ref={mapRef}
        className="absolute"
        style={{
          width: cols * TILE_SIZE,
          height: rows * TILE_SIZE,
          transform: `translate(calc(50vw - ${playerPixelX * scale}px), calc(50vh - ${playerPixelY * scale}px)) scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateRows: `repeat(${rows}, ${TILE_SIZE}px)`,
            gridTemplateColumns: `repeat(${cols}, ${TILE_SIZE}px)`,
          }}
        >
          {Array.from({ length: rows * cols }, (_, index) => {
            const row = Math.floor(index / cols)
            const tileType = row < WALL_HEIGHT ? 'wall' : 'floor'
            return (
              <div
                key={index}
                className="w-8 h-8"
                style={{
                  backgroundImage: `url(/lounge/${tileType}.png)`,
                  backgroundSize: 'cover',
                }}
              />
            )
          })}
        </div>

        {/* Decor */}
        {decor
          .sort((a, b) => a.y - b.y)
          .map((item, i) => (
            <img
              key={`decor-${i}`}
              src={`/decor/${item.type}.png`}
              alt={item.type}
              className="absolute pointer-events-none"
              style={{
                zIndex: item.z ?? 1000 + item.y * TILE_SIZE,
                top: item.y * TILE_SIZE,
                left: item.x * TILE_SIZE,
                width: (item.w ?? 1) * TILE_SIZE,
                height: (item.h ?? 1) * TILE_SIZE,
                transform: 'translate(-50%, -100%)',
              }}
            />
          ))}

        {/* Other Players */}
        {players.map((p) =>
          typeof p.x === 'number' && typeof p.y === 'number' ? (
            <RemotePlayer
              key={p.id}
              spriteName={p.spriteName}
              playerName={p.playerName}
              x={p.x}
              y={p.y}
              message={p.message}
            />
          ) : null
        )}

        {!activeGame && (
          <LocalPlayer
            spriteName={spriteName}
            playerName={playerName}
            x={playerX}
            y={playerY}
            setX={setPlayerX}
            setY={setPlayerY}
            mapWidth={cols}
            mapHeight={rows}
            collisionSet={collisionSet}
            setPixelX={setPlayerPixelX}
            setPixelY={setPlayerPixelY}
            message={submittedMessage}
            movementOverride={mobileMove}
          />
        )}
      </div>

      {/* Game Library */}
      {showLibrary && !activeGame && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-gray-900 text-white p-8 rounded-lg shadow-xl w-[400px]">
            <h2 className="text-2xl font-bold mb-6 text-center">🎮 Wanna Play?</h2>
            <ul className="space-y-4 text-lg">
              <li>
                🕹️{' '}
                <button
                  onClick={() => {
                    setLoading(true)
                    setTimeout(() => {
                      setActiveGame('shooter')
                      setLoading(false)
                      setGameStarted(false)
                    }, 1000)
                  }}
                >
                  Samus Shooter
                </button>
              </li>
              <li>
                🕹️{' '}
                <button
                  onClick={() => {
                    setLoading(true)
                    setTimeout(() => {
                      setActiveGame('crossy-roads')
                      setLoading(false)
                      setGameStarted(false)
                    }, 1000)
                  }}
                >
                  Crossy Roads
                </button>
              </li>
              {/* <li>
                🕹️{' '}
                <button
                  onClick={() => {
                    setLoading(true)
                    setTimeout(() => {
                      router.push('/games/suitch-madness/lobby')
                    }, 500)
                  }}
                >
                  Suitch Madness
                </button>
              </li> */}
              <li className="text-gray text-center">
                More games coming soon! 🚀
              </li>
            </ul>
          </div>
        </div>
      )}

      {loading && !activeGame && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="text-white text-2xl font-semibold animate-pulse">🎮 Loading game...</div>
        </div>
      )}

      {activeGame && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[10000] flex items-center justify-center">
          <div
            className="relative w-[1200px] h-[580px] bg-center bg-no-repeat bg-contain"
            style={{
              backgroundImage: 'url("/suitch.png")',
              backgroundSize: '100% 100%',
            }}
          >
            {!gameStarted && (
              <div
                className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center cursor-pointer"
                onClick={() => setGameStarted(true)}
              >
                <div className="text-white text-2xl font-bold animate-pulse">▶️ Click to Start Playing</div>
              </div>
            )}
            {gameStarted && (
              <div
                className="absolute rounded overflow-hidden shadow-lg border-2 border-black"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '50%',
                  height: '80%',
                }}
              >
                <iframe
                  src={`/games/${activeGame}`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                />
              </div>
            )}
            <button
              onClick={() => {
                setActiveGame(null)
                setGameStarted(false)
              }}
              className="absolute top right-1 bg-white text-black px-3 py-1 rounded shadow z-10"
            >
              ✖ Exit
            </button>
          </div>
        </div>
      )}

      {/* Chat Input */}
        {!activeGame && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-md px-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const trimmed = chat.trim()
                if (trimmed) {
                  const timestamp = Date.now()
                  const message = { text: trimmed, timestamp }

                  set(ref(db, `players/${playerId.current}/message`), message)
                  setSubmittedMessage(message)
                  setChat("")

                  setTimeout(() => {
                    // Clear from Firebase
                    set(ref(db, `players/${playerId.current}/message`), null)
                    // Clear locally
                    setSubmittedMessage(null)
                  }, 4000)
                }
              }}
              className="flex bg-white/20 backdrop-blur-md rounded-full shadow-md overflow-hidden border border-white/30"
            >
              <input
                type="text"
                className="flex-1 px-4 py-2 bg-transparent text-black placeholder-black/60 outline-none"
                placeholder="Say something..."
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                maxLength={100}
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 font-bold hover:bg-blue-700 transition"
              >
                Send
              </button>
            </form>
          </div>
        )}
        {isMobile && !activeGame && (
          <div className="absolute bottom-20 right-6 z-[9999]">
            <div className="grid grid-cols-3 gap-2">
              <div />
              <button
                className="w-12 h-12 bg-gray-700 bg-opacity-60 text-white rounded-full select-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                onMouseDown={() => setMobileMove("ArrowUp")}
                onMouseUp={() => setMobileMove(null)}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    setMobileMove("ArrowUp")
                  }}
                onTouchEnd={() => setMobileMove(null)}
              >
                ↑
              </button>
              <div />
              <button
                className="w-12 h-12 bg-gray-700 bg-opacity-60 text-white rounded-full select-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                onMouseDown={() => setMobileMove("ArrowLeft")}
                onMouseUp={() => setMobileMove(null)}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    setMobileMove("ArrowLeft")
                  }}
                onTouchEnd={() => setMobileMove(null)}
              >
                ←
              </button>
              <div />
              <button
                className="w-12 h-12 bg-gray-700 bg-opacity-60 text-white rounded-full select-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                onMouseDown={() => setMobileMove("ArrowRight")}
                onMouseUp={() => setMobileMove(null)}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    setMobileMove("ArrowRight")
                  }}
                onTouchEnd={() => setMobileMove(null)}
              >
                →
              </button>
              <div />
              <button
                className="w-12 h-12 bg-gray-700 bg-opacity-60 text-white rounded-full select-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                onMouseDown={() => setMobileMove("ArrowDown")}
                onMouseUp={() => setMobileMove(null)}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    setMobileMove("ArrowDown")
                  }}
                onTouchEnd={() => setMobileMove(null)}
              >
                ↓
              </button>
              <div />
            </div>
          </div>
        )}
    </div>
  )
}