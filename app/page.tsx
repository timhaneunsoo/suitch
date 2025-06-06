import Link from "next/link"
import { Twitter, Send, DollarSign } from "lucide-react" // Icons for Twitter & Telegram

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-950 to-gray-900 text-white px-6 py-16 space-y-16">
      {/* Floating $SUITCH Coin */}
      <img
        src="/suitch-coin.png"
        alt="$SUITCH Coin"
        className="w-24 h-24 animate-bounce drop-shadow-xl"
      />

      {/* Title and Tagline */}
      <section className="text-center space-y-4">
        <h2 className="text-5xl font-extrabold tracking-tight text-sky-400">$SUITCH</h2>
        <p className="text-lg text-gray-300">
          SUI + SWITCH = $SUITCH — the switch of SUI.
        </p>
        <p className="text-sm text-gray-500 italic">
          Hold tight. The game economy is just getting started.
        </p>
      </section>

      {/* Game Library */}
      <section className="text-center space-y-6">
        <h3 className="text-3xl font-bold">🎮 Wanna Play?</h3>
        <ul className="space-y-3 text-lg">
          <li>
            <Link
              href="/games/crossy-roads"
              className="text-sky-400 hover:underline hover:text-sky-300 transition"
            >
              ▸ Crossy Roads
            </Link>
          </li>
          <li className="text-gray-500 italic">More games coming soon...</li>
        </ul>
      </section>

      {/* Social Links */}
      <footer className="mt-12 text-center space-y-2 text-gray-500 text-sm">
        <div className="flex justify-center gap-6">
          <a
            href="https://t.me/nintendosuitch"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-400 transition"
          >
            <Send className="w-5 h-5" />
          </a>
          <a
            href="https://x.com/NintendoSuitch"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-400 transition"
          >
            <Twitter className="w-5 h-5" />
          </a>
          <a
            href="https://raidenx.io/sui/moonbags-suitch-sui-259917"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-400 transition"
          >
            <img
              src="/raidenx-logo.jpg"
              alt="RaidenX Logo"
              className="w-5 h-5 rounded"
            />
          </a>
        </div>
      </footer>
    </main>
  )
}
