'use client'
import { useEffect, useRef } from 'react'

export default function ShooterGamePage() {
  const innerIframeRef = useRef<HTMLIFrameElement>(null)

  // Forward postMessage from parent to the game iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!innerIframeRef.current) return
      innerIframeRef.current.contentWindow?.postMessage(event.data, '*')
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <main className="w-screen h-screen bg-black m-0 p-0 overflow-hidden">
      <iframe
        ref={innerIframeRef}
        src="/games/shooter/shooter.html"
        className="w-full h-full border-none"
        title="Samus Shooter - SUITCH Edition"
      />
    </main>
  )
}
