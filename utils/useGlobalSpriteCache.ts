// utils/useGlobalSpriteCache.ts
import { useEffect, useState } from 'react'

const SPRITES = ['dave', 'grace', 'panda', 'shib', 'steve']
const DIRECTIONS = ['frontWalk', 'backWalk', 'leftWalk', 'rightWalk', 'idle']
const FRAME_COUNT = 8

type SpriteCache = Record<string, HTMLImageElement>

let globalSpriteCache: SpriteCache = {}
let globalLoaded = false

export function useGlobalSpriteCache() {
  const [loaded, setLoaded] = useState(globalLoaded)

  useEffect(() => {
    if (globalLoaded) {
      setLoaded(true)
      return
    }

    let loadedCount = 0
    const total = SPRITES.length * DIRECTIONS.length * FRAME_COUNT

    SPRITES.forEach(spriteName => {
      DIRECTIONS.forEach(dir => {
        for (let i = 1; i <= FRAME_COUNT; i++) {
          const key = `/sprites/${spriteName}/${dir}/${dir}_${i}.png`
          const img = new Image()
          img.src = key
          img.onload = () => {
            loadedCount++
            if (loadedCount === total) {
              globalLoaded = true
              setLoaded(true)
            }
          }
          globalSpriteCache[key] = img
        }
      })
    })
  }, [])

  return { sprites: globalSpriteCache, loaded }
}
