import Link from "next/link";
import Squares from "../components/BackgroundGrid";
import ListGame from "../components/ListGame";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 font-sans relative overflow-hidden">
      {/* Background Overlay with Grid */}
      <div className="h-screen w-full">
        <Squares
          speed={0.3}
          squareSize={75}
          direction='diagonal'
          borderColor='#111325' />
      </div>

      <div className="absolute">
        <div className="z-10 text-center space-y-4">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-purple-700 tracking-tighter">
            ARCADE PROTOCOL
          </h1>

          <p className="text-gray-400 text-xl tracking-widest uppercase font-light">
            Select Your Mission
          </p>

          <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto px-4 my-8">
            <ListGame
              href="/hand-slicer"
              title="HAND SLICER"
              description="Use your hands to slice incoming orbs. Avoid the red killers!"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
              }
              color="sky-600"
              colorTo="blue-800"
            />

            <ListGame
              href="/hand-rhythm"
              title="HAND RHYTHM"
              description="Beat detection rhythm game. Hit circles in sync with the music!"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              }
              color="purple-500"
              colorTo="indigo-800"
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 text-gray-500 text-sm font-mono">
        SYSTEM STATUS: ONLINE
      </div>
    </main>
  );
}
