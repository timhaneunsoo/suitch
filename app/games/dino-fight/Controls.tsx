// app/games/dino-fight/Controls.tsx
'use client'

export default function Controls() {
  const controls = [
    { key: '← / A', action: 'Move Left' },
    { key: '→ / D', action: 'Move Right' },
    { key: '↑ / W / Space', action: 'Jump' },
    { key: 'J', action: 'Bite Attack' },
    { key: 'K', action: 'Kick Attack' },
    { key: 'I', action: 'Avoid / Dodge' },
  ]

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🎮 Controls</h1>
      <ul className="space-y-4">
        {controls.map((c) => (
          <li key={c.key} className="text-lg">
            <span className="font-mono bg-gray-800 px-2 py-1 rounded mr-4">{c.key}</span>
            {c.action}
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <a href="/games/dino-fight" className="underline text-blue-400 hover:text-blue-200">
          ← Back to Game
        </a>
      </div>
    </div>
  )
}
