// multiplayer.js

import { ref, onValue, set, onDisconnect } from 'firebase/database'
import { db } from '@/utils/firebase'

export function setupMultiplayer(player, playerId) {
  const playerRef = ref(db, `dino-fight/live/players/${playerId}`)

  const updateState = () => {
    if (!player) return
    set(playerRef, {
      x: player.x,
      y: player.y,
      dir: player.facing,
      frame: player.frame,
      sprite: player.dinoName,
      action: player.action,
      name: player.name,
      health: player.health,
    })
  }

  onDisconnect(playerRef).remove()
  setInterval(updateState, 50) // sync every 100ms
}

export function subscribeToPlayers(playerId, callback) {
  const playersRef = ref(db, 'dino-fight/live/players')
  onValue(playersRef, (snap) => {
    const all = snap.val() || {}
    delete all[playerId]
    callback(all)
  })
}
