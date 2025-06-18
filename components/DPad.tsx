'use client'

interface DPadProps {
  onMove: (dir: string | null) => void
  allowed: ('up' | 'down' | 'left' | 'right')[]
}

export default function DPad({ onMove, allowed }: DPadProps) {
  const createBtn = (dir: string, label: string) => (
    <button
      className="w-12 h-12 bg-gray-700 bg-opacity-70 text-white rounded-full select-none"
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onMouseDown={() => onMove(`Arrow${dir.charAt(0).toUpperCase() + dir.slice(1)}`)}
      onMouseUp={() => onMove(null)}
      onTouchStart={(e) => {
        e.preventDefault()
        onMove(`Arrow${dir.charAt(0).toUpperCase() + dir.slice(1)}`)
      }}
      onTouchEnd={() => onMove(null)}
    >
      {label}
    </button>
  )

  return (
    <div className="grid grid-cols-3 gap-1">
      <div />
      {allowed.includes('up') ? createBtn('up', '↑') : <div />}
      <div />
      {allowed.includes('left') ? createBtn('left', '←') : <div />}
      <div />
      {allowed.includes('right') ? createBtn('right', '→') : <div />}
      <div />
      {allowed.includes('down') ? createBtn('down', '↓') : <div />}
      <div />
    </div>
  )
}
