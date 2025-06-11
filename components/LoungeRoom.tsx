// Full updated LoungeRoom.tsx with idle timeout fix (500ms)
'use client'
import { useEffect, useRef, useState } from 'react'
import Player from './Player'
import { db } from '@/utils/firebase'
import { ref, onValue, set, onDisconnect, update } from 'firebase/database'
import { throttle } from 'lodash'

const TILE_SIZE = 32
const rows = 20
const cols = 25
const scale = 2
const WALL_HEIGHT = 3

interface LoungeRoomProps {
  spriteName?: string
  playerName?: string
}

type DecorItem = {
  type: string
  x: number
  y: number
  w?: number
  h?: number
  z?: number
  collides?: boolean
}

const decor: DecorItem[] = [
  { type: "counter", x: 2, y: 6, w: 4, h: 1, z: 20, collides: true },
  { type: "register", x: 3.2, y: 5.5, collides: true },
  { type: "bread", x: .8, y: 5.5, w: 0.8, h: 0.8, collides: true },
  { type: "pastry-stand", x: 1.9, y: 5.5, w: 0.8, h: 0.8, collides: true },
  { type: "fridge", x: 0.5, y: 3.5, w: 1, h: 2, z: 10, collides: true },
  { type: "counter", x: 2.5, y: 3.5, w: 3, h: 1, z: 20, collides: true },
  { type: "coffee-machine", x: 2, y: 3, w: 1, h: 1, collides: true },
  { type: "sink", x: 3.3, y: 2.98, w: .8, h: .8, z: 30, collides: true },
  { type: "sign", x: 5, y: 6, w: 1, h: 1.2, z: 30 },
  { type: "rug", x: 12.5, y: 6, w: 3, h: 2, z: 5 },
  { type: "table-tall", x: 2, y: 9, w: 1, h: 1, collides: true },
  { type: "table-tall", x: 4, y: 9, w: 1, h: 1, collides: true },
  { type: "table-tall", x: 6, y: 9, w: 1, h: 1, collides: true },
  { type: "table", x: 4, y: 13, w: 1.5, h: 1.5, collides: true },
  { type: "table-seat", x: 2.5, y: 12.7, w: .75, h: .75, z: 20},
  { type: "table-seat", x: 5.5, y: 12.7, w: .75, h: .75, z: 20},
  { type: "table2", x: 4, y: 16, w: 1.5, h: 1.5, collides: true },
  { type: "table-seat", x: 2.5, y: 15.7, w: .75, h: .75, z: 20},
  { type: "table-seat", x: 5.5, y: 15.7, w: .75, h: .75, z: 20},
  { type: "couch", x: 22.2, y: 4, w: 3, h: 1.3, z: 20 },
  { type: "plant-tall2", x: 24.3, y: 3.7, w: .73, h: 2.08, z: 20, collides: true },
  { type: "water-pot", x: 16.4, y: 3.7, w: .46, h: .45, z: 20, collides: true },
  { type: "cactus", x: 17, y: 3.7, w: 1, h: 2, z: 20, collides: true },
  { type: "plant-tall", x: 18, y: 3.7, w: 1, h: 1.7, z: 20, collides: true },
  { type: "plant", x: 19, y: 3.7, w: 1, h: 1.3, z: 20, collides: true },
  { type: "crate", x: 19, y: 5, w: 1, h: 1, z: 20, collides: true },
  { type: "sign2", x: 3.3, y: 2.2, w: .9, h: 1.1, z: 10, collides: true },
  { type: "wall-art", x: 22.2, y: 2.4, w: 1.7, h: 2, z: 10, collides: true },
  { type: "window", x: 7, y: 2.5, w: 3, h: 2, z: 10, collides: true },
  { type: "suitch", x: 12.5, y: 2.5, w: 4, h: 2, z: 10, collides: true },
  { type: "window", x: 18, y: 2.5, w: 3, h: 2, z: 10, collides: true },
  { type: "cone", x: 13, y: 15, w: 1, h: 2, z: 10, collides: true },
  { type: "crate", x: 10, y: 15.3, w: 1, h: 1, z: 20, collides: true },
  { type: "crate", x: 11, y: 15.2, w: 1, h: 1, z: 20, collides: true },
  { type: "crate", x: 10.3, y: 16, w: 1, h: 1, z: 20, collides: true },
  { type: "crate", x: 11.3, y: 16.2, w: 1, h: 1, z: 20, collides: true },
  { type: "shell", x: 10.7, y: 15.6, w: 1, h: 1, z: 20, collides: true },
  { type: "jars", x: 10, y: 16.2, w: 1, h: .5, z: 20, collides: true },
  { type: "tv", x: 12, y: 15.5, w: 1, h: 1, z: 20, collides: true },
  { type: "anchor", x: 12.3, y: 15.9, w: 1, h: 1, z: 20, collides: true },
  { type: "log", x: 20, y: 13.5, w: .8, h: .8, z: 20 },
  { type: "log", x: 22, y: 14.2, w: .8, h: .8, z: 20 },
  { type: "log", x: 22.8, y: 16, w: .8, h: .8, z: 20 },
  { type: "log", x: 22, y: 17.8, w: .8, h: .8, z: 20 },
  { type: "log", x: 20, y: 18.5, w: .8, h: .8, z: 20 },
  { type: "log", x: 18, y: 17.8, w: .8, h: .8, z: 20 },
  { type: "log", x: 17.2, y: 16, w: .8, h: .8, z: 20 },
  { type: "log", x: 18, y: 14.2, w: .8, h: .8, z: 20 },
]

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
      for (let dx = 0.03; dx < w - 0.1; dx += 0.1) {
        for (let dy = 0.03; dy < h - 0.1; dy += 0.1) {
          const key = `${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`
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
      collisionSet.add(`${x.toFixed(1)},${y.toFixed(1)}`)
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
    const playerRef = ref(db, `players/${playerId.current}`)
    onDisconnect(playerRef).remove()

    let frame = 1
    let dir = 'idle'

    const sendUpdate = throttle(() => {
      update(playerRef, {
        spriteName,
        playerName,
        x: playerX,
        y: playerY,
        frame,
        dir,
        timestamp: Date.now(),
      })
    }, 100)

    const interval = setInterval(() => {
      sendUpdate()
      if (!activeGame && dir === 'idle') {
        frame = (frame % 8) + 1
      }
    }, 50)

    return () => {
      clearInterval(interval)
      set(playerRef, null)
    }
  }, [playerX, playerY, playerName, spriteName, activeGame])

  useEffect(() => {
    const playersRef = ref(db, 'players')
    const seenMessages = new Map<string, { text: string; timestamp: number }>()
    const lastTimestamps = new Map<string, number>()

    onValue(playersRef, (snapshot) => {
      const val = snapshot.val() || {}
      const now = Date.now()

      const updatedPlayers = Object.entries(val)
        .filter(([id]) => id !== playerId.current)
        .map(([id, data]: any) => {
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

          const lastSeen = lastTimestamps.get(id) || 0
          lastTimestamps.set(id, data.timestamp)

          return {
            id,
            ...data,
            message: seenMessages.get(id),
            dir: data.dir ?? 'idle',
            frame: data.frame ?? 1,
          }
        })

      setPlayers((prevPlayers) =>
        updatedPlayers.map((newPlayer) => {
          const prev = prevPlayers.find((p) => p.id === newPlayer.id)
          return {
            ...prev,
            ...newPlayer,
          }
        })
      )
    })
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
            <Player
              key={p.id}
              spriteName={p.spriteName}
              playerName={p.playerName}
              x={p.x}
              y={p.y}
              setX={() => {}}
              setY={() => {}}
              mapWidth={cols}
              mapHeight={rows}
              collisionSet={collisionSet}
              message={p.message}
              dir={p.dir}
              frame={p.frame}
              isRemote={true}
            />
          ) : null
        )}

        {!activeGame && (
          <Player
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
            isRemote={false}
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
    </div>
  )
}
