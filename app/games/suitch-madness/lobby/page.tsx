'use client'

import { useEffect, useState } from 'react'
import { db } from '@/utils/firebase'
import { ref, onValue, set, remove, update, onDisconnect } from 'firebase/database'
import { useRouter } from 'next/navigation'

export default function SuitchLobby() {
  const [players, setPlayers] = useState<Record<string, any>>({})
  const [playerName, setPlayerName] = useState('')
  const [joined, setJoined] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [currentId, setCurrentId] = useState('')

  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('suitchId')
      if (!id) {
        id = Math.random().toString(36).slice(2)
        localStorage.setItem('suitchId', id)
      }
      setCurrentId(id)
    }
  }, [])

  useEffect(() => {
    if (!currentId) return

    const playersRef = ref(db, 'suitch-madness/lobby/players')
    const startedRef = ref(db, 'suitch-madness/lobby/started')
    const countdownRef = ref(db, 'suitch-madness/lobby/countdown')

    onValue(playersRef, (snap) => {
      setPlayers(snap.val() || {})
    })

    onValue(startedRef, (snap) => {
      if (snap.val()) {
        router.push('/games/suitch-madness')
      }
    })

    onValue(countdownRef, (snap) => {
      const data = snap.val()
      if (!data?.startsAt) return

      const interval = setInterval(() => {
        const secondsLeft = Math.floor((data.startsAt - Date.now()) / 1000)
        setCountdown(secondsLeft)
        if (secondsLeft <= 0) {
          update(ref(db, 'suitch-madness/lobby'), { started: true })
          clearInterval(interval)
        }
      }, 250)

      return () => clearInterval(interval)
    })
  }, [currentId, router])

  const handleJoin = async () => {
    if (!playerName.trim()) return
    localStorage.setItem('suitchName', playerName)

    const playerRef = ref(db, `suitch-madness/lobby/players/${currentId}`)
    await set(playerRef, { name: playerName, ready: true })
    setJoined(true)

    onDisconnect(playerRef).remove()

    // Auto-reset if last player
    const playersRef = ref(db, 'suitch-madness/lobby/players')
    onValue(playersRef, (snap) => {
      const val = snap.val() || {}
      const isLast = Object.keys(val).length === 1 && val[currentId]
      if (isLast) {
        onDisconnect(ref(db, 'suitch-madness/lobby')).update({
          started: false,
          countdown: null,
        })
      }
    })
  }

  // Auto countdown when 2+ players
  useEffect(() => {
    const isHost = Object.keys(players)[0] === currentId
    if (Object.keys(players).length >= 2 && isHost) {
      const countdownRef = ref(db, 'suitch-madness/lobby/countdown')
      set(countdownRef, { startsAt: Date.now() + 10000 }) // 10s
    }
  }, [players, currentId])

  const startGame = () => {
    update(ref(db, 'suitch-madness/lobby'), { started: true })
  }

  const isHost = Object.keys(players)[0] === currentId

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">🎮 Suitch Madness Lobby</h1>

      {!joined ? (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="px-4 py-2 border rounded"
          />
          <br />
          <button
            onClick={handleJoin}
            className="bg-pink-500 text-white px-4 py-2 rounded"
          >
            Join Game
          </button>
        </div>
      ) : (
        <>
          {countdown !== null && (
            <p className="text-lg font-semibold text-yellow-600 mb-2">
              Game starting in {countdown} second{countdown !== 1 && 's'}...
            </p>
          )}

          <p className="mb-2">Waiting for players...</p>
          <ul className="mb-4 space-y-1">
            {Object.entries(players).map(([id, p], index) => (
              <li key={id} className="text-sm">
                {p.name} {id === currentId && '(You)'}{' '}
                {index === 0 && '👑 Host'}
              </li>
            ))}
          </ul>

          {isHost && (
            <button
              onClick={startGame}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Start Game
            </button>
          )}
        </>
      )}
    </main>
  )
}
