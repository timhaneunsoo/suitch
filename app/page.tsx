'use client'
import { useState } from "react"
import LoungeRoom from "@/components/LoungeRoom"
import { Twitter, Send } from "lucide-react"
import AnimatedPreview from "@/components/AnimatedPreview"


export default function Home() {
  const [showModal, setShowModal] = useState(true)
  const [playerName, setPlayerName] = useState("")
  const [selectedChar, setSelectedChar] = useState("")

  const characters = ["panda", "dave", "grace", "shib", "steve"] // Add more if needed


  return (
    <main className="min-h-screen bg-black text-white relative">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white text-black p-8 rounded-xl shadow-lg w-full max-w-md space-y-6 text-center">
            <img
              src="/suitch-coin.png"
              alt="$SUITCH Coin"
              className="w-20 h-20 mx-auto animate-bounce drop-shadow-xl"
            />
            <h2 className="text-3xl font-bold text-sky-500">$SUITCH</h2>
            <p>SUI + SWITCH = $SUITCH — the switch of SUI.</p>
            <p className="text-sm text-gray-600 italic">
              Hold tight. The game economy is just getting started.
            </p>
            {/* Player Name Input */}
            <div className="space-y-2 text-sm">
              <label className="block font-medium text-gray-700">Your Name:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 rounded border border-gray-300 text-gray-800 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {/* Character Picker */}
            <div className="space-y-2 text-sm mt-4">
              <label className="block font-medium text-gray-700">Choose your character:</label>
              <div className="flex gap-4 justify-center flex-wrap">
                {characters.map(char => (
                  <button
                    key={char}
                    onClick={() => setSelectedChar(char)}
                    className={`border p-1 rounded flex flex-col items-center ${
                      selectedChar === char ? 'border-sky-500' : 'border-gray-300'
                    }`}
                  >
                    <AnimatedPreview character={char} />
                  </button>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="flex justify-center gap-4 pt-4">
              <a href="https://t.me/nintendosuitch" target="_blank" className="hover:text-sky-500"><Send /></a>
              <a href="https://x.com/NintendoSuitch" target="_blank" className="hover:text-sky-500"><Twitter /></a>
              <a href="https://raidenx.io/sui/moonbags-suitch-sui-259917" target="_blank">
                <img src="/raidenx-logo.jpg" className="w-5 h-5 rounded-full" />
              </a>
            </div> 

            <button
              disabled={!playerName.trim() || !selectedChar}
              onClick={() => setShowModal(false)}
              className={`mt-6 px-4 py-2 rounded transition text-white ${
                playerName.trim() && selectedChar ? 'bg-sky-500 hover:bg-sky-600' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Enter Lounge
            </button>
          </div>
        </div>
      )}

      {/* Lounge only visible after modal */}
      {!showModal && (
        <LoungeRoom
          spriteName={selectedChar}
          playerName={playerName}
        />
      )}
    </main>
  )
}
