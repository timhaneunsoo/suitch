import { useState, useEffect } from 'react'

export default function usePlayerInfo() {
  const [playerId, setPlayerId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('Player')
  const [spriteName, setSpriteName] = useState<string>('panda')

  useEffect(() => {
    // ID
    let id = localStorage.getItem('suitchId')
    if (!id) {
      id = Math.random().toString(36).slice(2)
      localStorage.setItem('suitchId', id)
    }
    setPlayerId(id)

    // Name (from lounge)
    const name = localStorage.getItem('suitchName') || 'Player'
    setPlayerName(name)

    // Sprite (from lounge)
    const sprite = localStorage.getItem('suitchSprite') || 'panda'
    setSpriteName(sprite)
  }, [])

  return { playerId, playerName, spriteName }
}
