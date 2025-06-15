// Logic.ts
export function generateMap(width: number, height: number): number[][] {
  const map = Array.from({ length: height }, () => Array(width).fill(0))

  // Solid ground
  for (let x = 0; x < width; x++) {
    map[height - 1][x] = 1
  }

  // Add a few platforms
  for (let i = 2; i < width - 2; i += 5) {
    const y = height - 4 - (Math.floor(Math.random() * 3))
    for (let j = 0; j < 3; j++) {
      if (i + j < width) {
        map[y][i + j] = 1
      }
    }
  }

  return map
}

export function generateItems(
  players: Record<string, any>,
  map: number[][],
  existingItems: Record<string, any>
): Record<string, any> {
  const newItems: Record<string, any> = {}

  // Limit total items
  if (Object.keys(existingItems).length > 15) return newItems

  const width = map[0].length
  const height = map.length

  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * width)
    const y = Math.floor(Math.random() * height)

    if (map[y][x] === 0) {
      const below = map[y + 1] && map[y + 1][x] === 1
      const key = `${x}_${y}`
      if (below && !existingItems[key]) {
        newItems[key] = {
          type: Math.random() < 0.2 ? 'golden' : 'regular',
          x,
          y,
        }
      }
    }
  }

  return newItems
}
