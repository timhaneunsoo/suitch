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
import GameControls from './GameControls'
import { gameLibrary } from './gameLibrary'

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false)

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('suitchName', playerName)
      localStorage.setItem('suitchSprite', spriteName)
    }
  }, [playerName, spriteName])

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

  // Repeat movement every 100ms while holding
  useEffect(() => {
    if (!iframeRef.current || !mobileMove) return;

    const sendMove = () => {
      iframeRef.current!.contentWindow?.postMessage(
        { type: 'MOVE', dir: mobileMove, action: 'start' },
        '*'
      );
    };

    sendMove(); // send first one immediately
    const interval = setInterval(sendMove, 100); // keep sending every 100ms

    return () => clearInterval(interval); // stop when mobileMove changes or is cleared
  }, [mobileMove]);

  function isPortraitGame(gameId: string | null) {
    const portraitGames = ['peach-jump', 'flappy-bird', 'vertical-platformer'] // Update with your actual portrait-mode game IDs
    return portraitGames.includes(gameId ?? '')
  }

  useEffect(() => {
    if (showTelegramModal) {
      const existing = document.getElementById('telegram-widget-script')
      if (!existing) {
        const script = document.createElement('script')
        script.id = 'telegram-widget-script'
        script.src = 'https://telegram.org/js/telegram-widget.js?7'
        script.setAttribute('data-telegram-discussion', 'suitchlounge')
        script.setAttribute('data-comments-limit', '10')
        script.setAttribute('data-color', '1E90FF')
        script.setAttribute('data-dark', '1')
        script.setAttribute('data-height', '400px')
        script.async = true
        document.getElementById('telegram-chat-widget')?.appendChild(script)
      }
    }
  }, [showTelegramModal])

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

      <button
        onClick={() => setShowTelegramModal(true)}
        className="absolute top-4 right-4 z-[9999] bg-white/80 text-black px-4 py-2 rounded shadow hover:bg-white transition"
      >
        💬 Telegram
      </button>

      {showTelegramModal && (
        <div className="absolute inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white w-[90%] max-w-md p-6 rounded-lg shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={() => setShowTelegramModal(false)}
            >
              ✖
            </button>
            <h2 className="text-xl font-bold mb-4 text-center">Live Telegram Chat</h2>
            <div id="telegram-chat-widget" className="w-full flex justify-center" />
          </div>
        </div>
      )}

      {/* Game Library */}
      {showLibrary && !activeGame && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-gray-900 text-white p-8 rounded-lg shadow-xl w-[400px]">
            <h2 className="text-2xl font-bold mb-6 text-center">🎮 Wanna Play?</h2>
            <ul className="space-y-4 text-lg">
              {gameLibrary.map((game) => (
                <li
                  key={game.id}
                  className={`flex items-center ${
                    game.comingSoon ? 'text-gray' : 'cursor-pointer hover:underline'
                  }`}
                  onClick={() => {
                    if (game.comingSoon) return
                    setLoading(true)
                    setTimeout(() => {
                      if (game.route.includes('/')) {
                        router.push(`/games/${game.route}`)
                      } else {
                        setActiveGame(game.id)
                        setGameStarted(false)
                      }
                      setLoading(false)
                    }, 1000)
                  }}
                >
                  <span>{game.label}</span>
                  <div className="flex items-center space-x-1 ml-2">
                    {game.icon && (
                      <img src={game.icon} alt={`${game.title} icon`} className="w-6 h-6" />
                    )}
                    {game.comingSoon && <span className="italic text-sm">Coming soon! 🚀</span>}
                  </div>
                </li>
              ))}
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
        <>
          {/* Desktop SUITCH frame */}
          {!isMobile && (
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

          {/* Mobile Game Boy style */}
          {isMobile && (
            <div
              className="fixed inset-0 z-[10000] bg-black flex flex-col"
              style={{ height: '100dvh', overflow: 'hidden' }}
            >
              {/* Game Area: top half */}
              <div
                className="relative bg-black"
                style={{
                  flexBasis: isPortraitGame(activeGame) ? '70%' : '60%',
                  flexGrow: 0,
                  flexShrink: 0,
                }}
              >
                {!gameStarted ? (
                  <div
                    className="absolute inset-0 flex justify-center items-center bg-black/60 cursor-pointer"
                    onClick={() => setGameStarted(true)}
                  >
                    <div className="text-white text-xl font-bold animate-pulse">▶️ Tap to Start</div>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    src={`/games/${activeGame}`}
                    className="absolute inset-0 w-full h-full border-none"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Controls: bottom half */}
              <div
                className="flex flex-col justify-between items-center bg-black px-4 pt-10 pb-10"
                style={{
                  flexBasis: isPortraitGame(activeGame) ? '30%' : '40%',
                  flexGrow: 0,
                  flexShrink: 0,
                }}
              >
                <div className="grid grid-cols-3 gap-3">
                  <div />
                    <GameControls
                      onMove={setMobileMove}
                      onAction={(btn, action) => {
                        if (!iframeRef.current) return
                        iframeRef.current.contentWindow?.postMessage(
                          { type: 'ACTION', button: btn, action },
                          '*'
                        )
                      }}
                    />
                  <div />
                </div>
                  <button
                    onClick={() => {
                      setActiveGame(null)
                      setGameStarted(false)
                    }}
                    className="mt-4"
                    style={{
                      touchAction: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                    }}
                  >
                    <img
                      src="/game-controls/Home_Button.png"
                      alt="Home"
                      className="w-10 h-10 mx-auto"
                      draggable={false}
                    />
                  </button>
              </div>
            </div>
          )}

        </>
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
          <div className="absolute bottom-20 left-6 z-[9999]">
            <div className="grid grid-cols-3 gap-1">
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