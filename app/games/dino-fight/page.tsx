'use client'

import { useEffect, useRef } from 'react'
import { db } from '@/utils/firebase'
import { get, ref as dbRef } from 'firebase/database'
import { startGame } from './dinoGame'
import usePlayerInfo from '@/utils/usePlayerInfo'

export default function DinoFightPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { playerId } = usePlayerInfo() // ✅ use your hook

  useEffect(() => {
    if (!playerId) return

    const fetchAndStart = async () => {
      try {
        const snap = await get(dbRef(db, `dino-fight/lobby/players/${playerId}`))
        const data = snap.val()
        const sprite = data?.sprite || 'dino1'
        const name = data?.name || 'Player'

        if (!sprite || typeof sprite !== 'string') {
          console.error('❌ Invalid or missing sprite:', sprite)
          return
        }

        if (canvasRef.current) {
          await startGame(canvasRef.current, playerId, sprite, name)
        }
      } catch (err) {
        console.error('🔥 Error loading player sprite or starting game', err)
      }
    }

    fetchAndStart()
  }, [playerId])

  return (
    <canvas
      ref={canvasRef}
      className="block bg-black"
      style={{ display: 'block', width: '100vw', height: 'auto' }}
    />
  )
}
