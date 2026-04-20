/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameCanvas } from './components/GameCanvas';

export default function App() {
  return (
    <main className="fixed inset-0 w-full h-full bg-[#05070a] flex flex-col items-center justify-center sm:p-4">
      <div className="w-full h-full max-w-[1400px] flex flex-col">
        <header className="flex-none py-6 px-4 flex justify-between items-center md:flex">
          <div className="hiddenflex flex-col">
            <h1 className="text-white font-black text-3xl tracking-tighter leading-none italic uppercase">
              REACTION<span className="text-cyan-400">LAB</span>
            </h1>
            <span className="text-[10px] text-white/40 font-mono tracking-[0.4em] uppercase mt-1">
              Neural Precision Unit // 0xAF42
            </span>
          </div>
          <div className="flex gap-4">
            <div className="hud-glass h-12 px-6 rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
              <span className="text-[10px] text-white font-bold uppercase tracking-widest">Vision_Link: Established</span>
            </div>
          </div>
        </header>

        <section className="flex-1 min-h-0 bg-transparent rounded-3xl overflow-hidden relative">
          <GameCanvas />
          
          {/* Decorative corner accents from Sleek theme */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-white/5 rounded-tl-3xl pointer-events-none z-30" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-white/5 rounded-tr-3xl pointer-events-none z-30" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-white/5 rounded-bl-3xl pointer-events-none z-30" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-white/5 rounded-br-3xl pointer-events-none z-30" />

          {/* Visually hidden SEO content block */}
          <section className="sr-only">
            <h2>About REACTION_LAB Hand-Tracking Game</h2>
            <p>
              REACTION_LAB is a cutting-edge browser-based shooter that utilizes 
              <strong>MediaPipe Hand Detection</strong> and artificial intelligence 
              to enable touchless gaming. By using advanced 
              <em>AI vision gestures</em>, players can aim and shoot targets 
              directly through their webcam.
            </p>
            <p>
              This cyberpunk reaction trainer features multiple target types, 
              including shielded enemies, ghost phantoms, and splitting fragments. 
              Improve your reflexes and precision with this innovative 
              <strong>web-based hand tracking solution</strong>.
            </p>
            <ul>
              <li>High-precision gesture recognition</li>
              <li>Dual-hand tracking support</li>
              <li>Real-time neural optics simulation</li>
              <li>Procedural audio synthesis</li>
            </ul>
          </section>
        </section>
        
        <footer className="flex-none py-6 px-4 flex justify-between items-center hidden md:flex">
          <p className="text-[10px] text-white/20 font-mono uppercase tracking-[0.2em]">Ready for target acquisition</p>
          <div className="flex gap-10">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">Protocol</span>
              <span className="text-xs text-cyan-400 font-bold uppercase">Vision_Gestures_v2</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">System</span>
              <span className="text-xs text-white font-bold uppercase">Active_Sync</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
