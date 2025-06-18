// app/games/dino-fight/assignUniqueDino.js
import { db } from '@/utils/firebase'
import { ref, get, set, onDisconnect } from 'firebase/database'

const allDinos = ['dino1','dino2','dino3','dino4','dino5','dino6','dino7','dino8']

export async function assignUniqueDino(playerId) {
  const playersRef = ref(db, 'dino-fight/players')
  const snap = await get(playersRef)

  const used = new Set()
  if (snap.exists()) {
    Object.values(snap.val()).forEach(p => {
      if (p.dino) used.add(p.dino)
    })
  }

  const avail = allDinos.filter(d => !used.has(d))
  if (avail.length === 0) throw new Error('No dinos available')

  const chosen = avail[Math.floor(Math.random()*avail.length)]
  const playerRef = ref(db, `dino-fight/players/${playerId}`)

  await set(playerRef, { dino: chosen, joinedAt: Date.now() })
  onDisconnect(playerRef).remove()

  return chosen
}
