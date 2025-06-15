'use client'

import React from 'react'

interface GridProps {
  gridWidth: number
  gridHeight: number
  tileSize: number
  players: Record<string, any>
  items: Record<string, any>
  map: number[][]
}

export default function PlatformerGrid({
  gridWidth,
  gridHeight,
  tileSize,
  players,
  items,
  map,
}: GridProps) {
  return (
    <div
      style={{
        width: gridWidth * tileSize,
        height: gridHeight * tileSize,
        position: 'relative',
        imageRendering: 'pixelated',
        backgroundColor: '#1c1c1c',
        border: '4px solid #555',
        overflow: 'hidden',
      }}
    >
      {map.map((row, y) =>
        row.map((tile, x) =>
          tile === 1 ? (
            <div
              key={`tile-${x}-${y}`}
              style={{
                position: 'absolute',
                left: x * tileSize,
                top: y * tileSize,
                width: tileSize,
                height: tileSize,
                backgroundColor: '#4a4a4a',
              }}
            />
          ) : null
        )
      )}

      {Object.entries(items).map(([key, item]) => (
        <div
          key={`item-${key}`}
          style={{
            position: 'absolute',
            left: item.x * tileSize + tileSize * 0.2,
            top: item.y * tileSize + tileSize * 0.2,
            width: tileSize * 0.6,
            height: tileSize * 0.6,
            borderRadius: '50%',
            backgroundColor: item.type === 'golden' ? 'gold' : '#ff69b4',
            boxShadow: '0 0 6px white',
          }}
        />
      ))}

      {Object.entries(players).map(([id, p]) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            left: p.x * tileSize,
            top: p.y * tileSize,
            width: tileSize,
            height: tileSize,
            backgroundColor: 'skyblue',
            border: '2px solid white',
          }}
        />
      ))}
    </div>
  )
}
