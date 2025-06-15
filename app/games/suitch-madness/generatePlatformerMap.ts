export function generateMap(width: number, height: number): number[][] {
  const map: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(0)
  )

  // Add a floor
  for (let x = 0; x < width; x++) {
    map[height - 1][x] = 1
  }

  // Add random platforms, not on the top or bottom rows
  for (let y = 1; y < height - 2; y++) {
    for (let x = 1; x < width - 2; x++) {
      if (Math.random() < 0.12) {
        map[y][x] = 1
        if (Math.random() < 0.5) map[y][x + 1] = 1
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
  const maxItems = 10

  const currentItemCount = Object.keys(existingItems).length
  if (currentItemCount >= maxItems) return {}

  let attempts = 0
  while (Object.keys(newItems).length + currentItemCount < maxItems && attempts < 50) {
    const x = Math.floor(Math.random() * map[0].length)
    const y = Math.floor(Math.random() * map.length)

    const key = `${x}_${y}`
    if (map[y][x] !== 0) continue // only place on empty tiles
    if (existingItems[key] || newItems[key]) continue // avoid duplicates

    newItems[key] = {
      type: Math.random() < 0.2 ? 'golden' : 'normal',
    }

    attempts++
  }

  return newItems
}
