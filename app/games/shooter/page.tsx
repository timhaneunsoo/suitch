"use client"

export default function ShooterGamePage() {
  return (
    <main className="w-screen h-screen bg-black m-0 p-0 overflow-hidden">
      <iframe
        src="/games/shooter/shooter.html"
        className="w-full h-full border-none"
        title="Samus Shooter - SUITCH Edition"
      />
    </main>
  )
}
