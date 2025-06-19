'use client'

interface GameControlsProps {
  onMove: (dir: string | null, action?: 'start' | 'end') => void
  onAction: (button: 'A' | 'B' | 'X' | 'Y' | null, action?: 'start' | 'end') => void
}

export default function GameControls({ onMove, onAction }: GameControlsProps) {
  const createImgBtn = (
    src: string,
    alt: string,
    onPress: () => void,
    onRelease: () => void
  ) => (
    <img
      src={`/game-controls/${src}`}
      alt={alt}
      className="w-14 h-14 select-none"
      draggable={false}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onTouchStart={(e) => {
        e.preventDefault()
        onPress()
      }}
      onTouchEnd={onRelease}
    />
  )

  return (
    <>
      {/* DPad Bottom Left */}
      <div className="absolute bottom-20 left-10 w-[160px] h-[160px]">
        <div className="absolute left-1/2 top-[8px] -translate-x-1/2">
          {createImgBtn('Directional_Button_Up.png', 'Up', () => onMove('ArrowUp'), () => onMove(null))}
        </div>
        <div className="absolute left-1/2 bottom-[8px] -translate-x-1/2">
          {createImgBtn('Directional_Button_Down.png', 'Down', () => onMove('ArrowDown'), () => onMove(null))}
        </div>
        <div className="absolute left-[8px] top-1/2 -translate-y-1/2">
          {createImgBtn('Directional_Button_Left.png', 'Left', () => onMove('ArrowLeft'), () => onMove(null))}
        </div>
        <div className="absolute right-[8px] top-1/2 -translate-y-1/2">
          {createImgBtn('Directional_Button_Right.png', 'Right', () => onMove('ArrowRight'), () => onMove(null))}
        </div>
      </div>

      {/* XYAB Buttons Bottom Right */}
      <div className="absolute bottom-20 right-10 w-[160px] h-[160px]">
        <div className="absolute left-1/2 top-[8px] -translate-x-1/2">
          {createImgBtn('X_Button.png', 'X', () => onAction('X', 'start'), () => onAction('X', 'end'))}
        </div>
        <div className="absolute left-[8px] top-1/2 -translate-y-1/2">
          {createImgBtn('Y_Button.png', 'Y', () => onAction('Y', 'start'), () => onAction('Y', 'end'))}
        </div>
        <div className="absolute right-[8px] top-1/2 -translate-y-1/2">
          {createImgBtn('A_Button.png', 'A', () => onAction('A', 'start'), () => onAction('A', 'end'))}
        </div>
        <div className="absolute left-1/2 bottom-[8px] -translate-x-1/2">
          {createImgBtn('B_Button.png', 'B', () => onAction('B', 'start'), () => onAction('B', 'end'))}
        </div>
      </div>
    </>
  )
}
