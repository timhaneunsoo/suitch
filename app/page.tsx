import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-8 space-y-12">
      {/* $SUITCH Introduction */}
      <section className="text-center max-w-2xl space-y-4">
        <h1 > </h1>
        <h2 className="text-3xl font-bold text-sky-400">$SUITCH</h2>
        <p className="text-lg text-gray-300">
          SUI + SWITCH = $SUITCH, the switch of SUI
        </p>
        <p className="text-sm text-gray-500 italic">Hold tight. The game economy is just getting started.</p>
      </section>

      {/* Game Library */}
      <section className="text-center">
        <h1 className="text-4xl font-bold mb-8">🎮 Wanna Play?</h1>
        <ul className="space-y-4 text-xl">
          <li>
            <Link href="/games/crossy-roads" className="text-blue-400 hover:underline">
              Crossy Roads
            </Link>
          </li>
          <li className="text-gray-400">More to come</li>
        </ul>
      </section>
    </main>
  )
}
