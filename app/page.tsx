"use client"

import { useEffect, useState } from "react"
import CrossyRoadsGame from "@/components/crossy-roads-game"

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Loading game...</div>
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <CrossyRoadsGame />
    </main>
  )
}
