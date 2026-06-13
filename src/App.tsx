/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import GameCanvas from "./components/GameCanvas";
import { Gamepad2, Info, Moon, Sun, ArrowUp, RefreshCw, Sparkles, Heart } from "lucide-react";

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Simulates pressing an arcade button to trigger gameplay jump
  const pressArcadeJumpButton = () => {
    // Generate a global KeyboardEvent to make the plumber jump!
    const keyEvent = new KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(keyEvent);
    
    // Quick haptic rumble or effect if supported
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const toggleCabinTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col items-center justify-between pb-8 ${isDarkMode ? "bg-radial from-neutral-900 to-black text-white" : "bg-neutral-100 text-neutral-900"}`}>
      
      {/* Top Header Navigator */}
      <header className={`w-full max-w-7xl px-6 py-4 flex justify-between items-center border-b transition-colors ${isDarkMode ? "border-neutral-800/80 bg-neutral-950/40" : "border-neutral-200 bg-white shadow-xs"}`}>
        <div className="flex items-center gap-3">
          <div className="bg-red-600 text-white p-2 rounded-xl shadow-lg border-2 border-red-500 animate-pulse">
            <Gamepad2 size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-retro text-xs sm:text-sm tracking-widest text-red-500 leading-none">
              PIXEL PLUMBER
            </h1>
            <p className="font-mono text-[9px] text-neutral-500 mt-1 uppercase tracking-wider">
              8-BIT RETRO CABINET
            </p>
          </div>
        </div>

        {/* Console Controls */}
        <div className="flex items-center gap-3">
          <button
            id="theme-toggler"
            onClick={toggleCabinTheme}
            className={`p-2 rounded-xl border transition ${isDarkMode ? "bg-neutral-800 border-neutral-700 text-yellow-400 hover:bg-neutral-700" : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-xs"}`}
            title="Toggle Ambient Light Mode"
          >
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono border ${isDarkMode ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-green-50 border-green-200 text-green-700"}`}>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
            60 FPS EMULATOR ACTIVE
          </div>
        </div>
      </header>

      {/* Main Container Layering */}
      <main className="w-full max-w-6xl px-4 py-6 flex-1 flex flex-col lg:flex-row gap-8 items-center justify-center">
        
        {/* Left column: Quick Feature Cards & Instruction Board */}
        <section className="w-full lg:w-72 flex flex-col gap-4 order-2 lg:order-1 self-stretch justify-center">
          {/* Theme specifications card */}
          <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${isDarkMode ? "bg-neutral-900/60 border-neutral-800" : "bg-white border-neutral-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-yellow-400 shrink-0" size={16} />
              <h2 className="font-retro text-[10px] text-red-500 tracking-wide uppercase">
                Chiptune Synth
              </h2>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-neutral-400">
              No static mp3 downloads is used here! Soundwaves are procedurally programmed in standard Web Audio chiptunes waveforms. Turn on BGM loop to enjoy nostalgic gaming loops.
            </p>
          </div>

          {/* Controls Information */}
          <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${isDarkMode ? "bg-neutral-900/60 border-neutral-800" : "bg-white border-neutral-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Info className="text-blue-400 shrink-0" size={16} />
              <h2 className="font-retro text-[10px] text-blue-400 tracking-wide uppercase">
                Retro Physics
              </h2>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-neutral-400">
              Gravity is simulated via progressive down-acceleration. Flapping creates upward state updates. Minimum spacing and gap height scale dynamically based on the scores!
            </p>
          </div>
        </section>

        {/* Center column: Beautiful Retro Arcade Cabinet Frame */}
        <section className="relative flex-1 flex flex-col items-center order-1 lg:order-2">
          
          {/* Outer Arcade Cabinet wood / metal container frame simulation */}
          <div className="relative w-full max-w-[530px] rounded-3xl border-8 border-neutral-800 bg-neutral-950 p-3 sm:p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
            
            {/* Retro LED Top Lightbar simulation */}
            <div className="w-full h-8 bg-neutral-900 rounded-lg flex items-center justify-between px-4 mb-4 border-b-2 border-neutral-800 shadow-inner">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 bg-red-600 rounded-full shadow-[0_0_8px_#ef4444]"></div>
                <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
              </div>
              <span className="font-retro text-[9px] text-red-500/80 tracking-widest animate-pulse">
                ★ COPT-CRT 9000 ★
              </span>
              <div className="flex gap-1 font-mono text-[8px] text-neutral-600">
                <span>INSERT</span>
                <span className="text-yellow-500 font-semibold animate-blink">$0.25</span>
              </div>
            </div>

            {/* SCREEN ZONE: Canvas Viewport Component render */}
            <div className="relative bg-neutral-950 rounded-2xl overflow-hidden shadow-inner">
              <GameCanvas />
            </div>

            {/* Interactive Physical Arcade Controls Deck wrapper */}
            <div className="mt-5 pt-4 border-t-4 border-neutral-800/60 flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
              
              {/* JoyStick Simulator graphic */}
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 bg-neutral-900 rounded-full border-4 border-neutral-800 flex items-center justify-center shadow-lg uppercase font-mono text-[8px] text-neutral-600">
                  {/* Glowing physical Joystick ball */}
                  <div className="absolute w-7 h-7 bg-red-600 rounded-full border-2 border-red-400 shadow-[0_0_12px_#ef4444] animate-bounce cursor-pointer flex items-center justify-center hover:bg-red-500">
                    <div className="w-2 h-2 bg-white/60 rounded-full transform -translate-x-1 -translate-y-1"></div>
                  </div>
                  <span className="absolute bottom-1 text-[7px]">JOYSTICK</span>
                </div>
                <div className="text-left">
                  <span className="block font-retro text-[8px] text-neutral-400">DIRECTION</span>
                  <span className="block font-mono text-[10px] text-neutral-600">AUTOMATIC SPEED</span>
                </div>
              </div>

              {/* Physical Red JUMP Button! */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="block font-retro text-[8px] text-neutral-400">ACTION DECK</span>
                  <span className="block font-mono text-[10px] text-neutral-600 hover:text-white transition">CLICK TO FLAP</span>
                </div>
                
                {/* Outer bezel */}
                <button
                  id="arcade-jump-button"
                  onClick={pressArcadeJumpButton}
                  className="w-16 h-16 bg-neutral-900 rounded-full border-4 border-neutral-800 shadow-xl flex items-center justify-center transform active:scale-95 transition-transform cursor-pointer relative group"
                >
                  {/* Glowing Red Button Cap */}
                  <div className="absolute w-12 h-12 bg-red-600 group-hover:bg-red-500 rounded-full border border-red-400 shadow-[0_4px_0_#991b1b,0_6px_10px_rgba(0,0,0,0.6)] group-active:translate-y-1 group-active:shadow-none transition-all flex items-center justify-center">
                    <ArrowUp size={16} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] stroke-[3]" />
                  </div>
                </button>
              </div>

            </div>

            {/* Physical Cabinet Coin Slot Illustration decoration for fun visual context */}
            <div className="mt-4 flex justify-center gap-6">
              <div className="w-12 h-14 bg-neutral-900 rounded-md border-2 border-neutral-800 flex flex-col justify-between items-center p-1.5 shadow-inner">
                <div className="w-1 h-6 bg-red-500/80 rounded animate-pulse"></div>
                <span className="font-mono text-[6px] text-neutral-500 leading-none">25¢ COIN</span>
              </div>
              <div className="w-12 h-14 bg-neutral-900 rounded-md border-2 border-neutral-800 flex flex-col justify-between items-center p-1.5 shadow-inner">
                <div className="w-1 h-6 bg-red-500/80 rounded animate-pulse"></div>
                <span className="font-mono text-[6px] text-neutral-500 leading-none">25¢ COIN</span>
              </div>
            </div>

          </div>
        </section>

        {/* Right column: Retro stats and facts */}
        <section className="w-full lg:w-72 flex flex-col gap-4 order-3 self-stretch justify-center">
          
          {/* Characters and sprites details */}
          <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${isDarkMode ? "bg-neutral-900/60 border-neutral-800" : "bg-white border-neutral-200"}`}>
            <h2 className="font-retro text-[10px] text-yellow-500 mb-3 tracking-wide uppercase">
              PLUMBER SPRITES
            </h2>
            
            {/* Mini matrix details list */}
            <div className="flex items-center gap-3">
              {/* Canvas placeholder illustrating the Plumber icon */}
              <div className="w-12 h-12 bg-neutral-950 rounded-xl flex items-center justify-center overflow-hidden border border-neutral-800">
                <div className="scale-125 grid grid-cols-16 gap-0 w-8 h-8 select-none pointer-events-none">
                  <div className="w-1.5 h-1.5 bg-red-600 col-span-16"></div>
                  {/* Simple illustration block for fun density */}
                  <span className="font-retro text-[8px] text-yellow-500">8bit</span>
                </div>
              </div>
              <div className="font-mono text-[11px] text-neutral-400 leading-relaxed">
                Rendered via dynamic scale matrices. Color codes R, B, S, K, W and Y represent Cap/Shirt, Overalls, Skin, Shoes/Mustache, Gloves and Buttons respectively!
              </div>
            </div>
          </div>

          {/* Tips card */}
          <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${isDarkMode ? "bg-neutral-900/60 border-neutral-800" : "bg-white border-neutral-200"}`}>
            <h2 className="font-retro text-[10px] text-green-500 mb-2 tracking-wide uppercase">
              FLIGHT TIPS
            </h2>
            <p className="font-mono text-[11px] text-neutral-400 leading-relaxed">
              Maintain a steady floating cadence! Take short, frequent jumps to navigate narrow gateways rather than big spikes. Clear as many brick towers as you can.
            </p>
          </div>

        </section>

      </main>

      {/* Retro developer credit bar */}
      <footer className="w-full max-w-7xl px-6 pt-4 text-center border-t border-neutral-800/10 dark:border-neutral-850">
        <p className="font-mono text-[10px] text-neutral-500 flex items-center justify-center gap-1.5 select-none">
          Made with <Heart size={10} className="text-red-500 fill-red-500 animate-pulse" /> for retro platformer games • © {new Date().getFullYear()} Pixel Arcade
        </p>
      </footer>
      
    </div>
  );
}
