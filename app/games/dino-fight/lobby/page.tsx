'use client'

import { useEffect, useState } from 'react'
import { db } from '@/utils/firebase'
import {
  ref,
  onValue,
  set,
  remove,
  update,
  onDisconnect,
} from 'firebase/database'
import { useRouter } from 'next/navigation'
import usePlayerInfo from '@/utils/usePlayerInfo'

export default function DinoFightLobby() {
  const [players, setPlayers] = useState<Record<string, any>>({})
  const [joined, setJoined] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const router = useRouter()
  const { playerId, playerName } = usePlayerInfo()

  useEffect(() => {
    if (!playerId) return

    const playersRef = ref(db, 'dino-fight/lobby/players')
    const startedRef = ref(db, 'dino-fight/lobby/started')
    const countdownRef = ref(db, 'dino-fight/lobby/countdown')

    onValue(playersRef, (snap) => {
      setPlayers(snap.val() || {})
    })

    onValue(startedRef, (snap) => {
      if (snap.val()) {
        router.push('/games/dino-fight')
      }
    })

    onValue(countdownRef, (snap) => {
      const data = snap.val()
      if (!data?.startsAt) return

      const interval = setInterval(() => {
        const secondsLeft = Math.floor((data.startsAt - Date.now()) / 1000)
        setCountdown(secondsLeft)
        if (secondsLeft <= 0) {
          update(ref(db, 'dino-fight/lobby'), { started: true })
          clearInterval(interval)
        }
      }, 250)

      return () => clearInterval(interval)
    })
  }, [playerId, router])

  useEffect(() => {
    const playerIds = Object.keys(players)
    const isHost = playerIds[0] === playerId
    if (playerIds.length === 4 && isHost) {
      set(ref(db, 'dino-fight/lobby/countdown'), {
        startsAt: Date.now() + 10000,
      })
    }
  }, [players, playerId])

  const handleJoin = async () => {
    if (!playerId || !playerName) return

    if (Object.keys(players).length >= 4) {
      alert('Game is full (4 players)')
      return
    }

    const playerRef = ref(db, `dino-fight/lobby/players/${playerId}`)

    const usedSprites = Object.values(players).map((p) => p.sprite)
    const availableSprite = ['dino1', 'dino2', 'dino3', 'dino4'].find(
      (s) => !usedSprites.includes(s)
    )

    if (!availableSprite) {
      alert('No available sprites!')
      return
    }

    await set(playerRef, {
      name: playerName,
      ready: true,
      sprite: availableSprite,
    })

    setJoined(true)
    onDisconnect(playerRef).remove()
  }

  const isHost = Object.keys(players)[0] === playerId

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <img
        src="/games/dino-fight/lobby.png"
        alt="Lobby Background"
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
      />

      <main className="relative z-10 p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-white">DINO SMASH</h1>

        {!joined ? (
          <button
            onClick={handleJoin}
            className="bg-indigo-500 text-white px-4 py-2 rounded"
          >
            Join as {playerName}
          </button>
        ) : (
          <>
            {countdown !== null && (
              <p className="text-lg font-semibold text-yellow-500 mb-2">
                Game starting in {countdown} second{countdown !== 1 && 's'}...
              </p>
            )}

            <p className="mb-2 text-white">Waiting for players...</p>
            <ul className="mb-4 space-y-1 text-white">
              {Object.entries(players).map(([id, p], index) => (
                <li key={id} className="text-sm">
                  {p.name} {id === playerId && '(You)'}{' '}
                  {index === 0 && '👑 Host'}
                </li>
              ))}
            </ul>

            <div className="bg-gray-900/80 text-white p-4 rounded-lg max-w-md mx-auto mt-6 text-left">
              <h2 className="text-lg font-bold mb-2">🎮 Controls</h2>
              <ul className="space-y-1 text-sm">
                <li><span className="font-mono text-yellow-300">← / A</span> – Move Left</li>
                <li><span className="font-mono text-yellow-300">→ / D</span> – Move Right</li>
                <li><span className="font-mono text-yellow-300">↑ / W / Space</span> – Jump</li>
                <li><span className="font-mono text-yellow-300">J</span> – Bite Attack</li>
                <li><span className="font-mono text-yellow-300">K</span> – Kick Attack</li>
                <li><span className="font-mono text-yellow-300">I</span> – Avoid / Dodge</li>
              </ul>
            </div>

            {isHost && countdown === null && (
              <div className="mt-4">
                <p className="text-green-500 text-sm font-semibold mb-2">
                  You are the host. Start the game manually or wait for 4 players to auto-start.
                </p>
                <button
                  onClick={() =>
                    update(ref(db, 'dino-fight/lobby'), { started: true })
                  }
                  disabled={Object.keys(players).length < 2}
                  className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Start Game Now
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
