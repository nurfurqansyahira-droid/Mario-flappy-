import { useState } from "react";
import { UserProfile } from "../types";
import { MOTOR_GIRLS_RECORDS, ENGINE_TRAILS_RECORDS, SPEEDWAY_THEMES_RECORDS } from "../data";
import { retroAudio } from "../audio";
import { Sparkles, Coins, Check, Bike, Wind, Palette, ShieldCheck, Gamepad2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GarageViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

type StoreTab = "CHARACTERS" | "TRAILS" | "THEMES";

export default function GarageView({ profile, onUpdateProfile }: GarageViewProps) {
  const [activeTab, setActiveTab] = useState<StoreTab>("CHARACTERS");
  const [selectedId, setSelectedId] = useState<string>("HARAJUKU");
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const activeMotorConfig = MOTOR_GIRLS_RECORDS.find(m => m.id === selectedId) || MOTOR_GIRLS_RECORDS[0];

  const handlePurchaseItem = (id: string, cost: number, category: StoreTab) => {
    if (profile.totalCoins < cost) {
      retroAudio.playGameOver();
      alert("Insufficient G-Coins! Race more to earn coin bounties.");
      return;
    }

    const updated = { ...profile };
    updated.totalCoins -= cost;

    if (category === "CHARACTERS") {
      if (!updated.unlockedCharacters.includes(id)) {
        updated.unlockedCharacters.push(id);
      }
    } else if (category === "TRAILS") {
      if (!updated.unlockedTrails.includes(id)) {
        updated.unlockedTrails.push(id);
      }
    } else if (category === "THEMES") {
      if (!updated.unlockedThemes.includes(id)) {
        updated.unlockedThemes.push(id);
      }
    }

    onUpdateProfile(updated);
    retroAudio.playCoin();
    setPurchaseSuccess(`Successfully added to your Speedway collection!`);
    setTimeout(() => setPurchaseSuccess(null), 3000);
  };

  const handleEquipItem = (id: string, category: StoreTab) => {
    const updated = { ...profile };
    
    if (category === "CHARACTERS") {
      updated.equippedCharacterId = id;
    } else if (category === "TRAILS") {
      updated.equippedTrailId = id;
    } else if (category === "THEMES") {
      updated.equippedThemeId = id;
    }

    onUpdateProfile(updated);
    retroAudio.playPoint();
  };

  return (
    <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800/80 rounded-3xl p-6 shadow-2xl flex flex-col min-h-[550px] relative overflow-hidden select-none">
      
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-805 pb-5 shrink-0">
        <div>
          <h2 className="text-xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-400 uppercase">
            🏎️ THE DRIFT GARAGE SHOWROOM
          </h2>
          <p className="font-mono text-xs text-neutral-500 uppercase mt-1 tracking-wider">
            License elite motor girls, configure exhaust quantum particle trails, and swap environmental asphalt matrices.
          </p>
        </div>

        {/* Player Bank */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-neutral-950/80 border border-neutral-800 rounded-2xl shadow-lg">
          <Coins className="w-4 h-4 text-yellow-400 shrink-0 animate-pulse" />
          <div className="text-left font-mono">
            <span className="text-[10px] text-neutral-500 uppercase block tracking-wider leading-none">Your G-Coins</span>
            <span className="text-sm font-black text-yellow-400 mt-1 block">🪙 {profile.totalCoins}</span>
          </div>
        </div>
      </div>

      {/* Purchase alerts */}
      <AnimatePresence>
        {purchaseSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-mono text-xs font-bold py-2.5 px-6 rounded-2xl shadow-[0_8px_25px_rgba(16,185,129,0.3)] z-50 text-center uppercase tracking-wider border border-green-400/20"
          >
            🎉 {purchaseSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom full-width design dashboard layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1 min-h-0">
        
        {/* Left Column: Nav Category Tabs and List Grid (8 columns) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 gap-4">
          
          {/* Custom Tabs */}
          <div className="flex bg-neutral-950 p-1 rounded-2xl gap-1 shrink-0">
            {(["CHARACTERS", "TRAILS", "THEMES"] as StoreTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "CHARACTERS") setSelectedId(MOTOR_GIRLS_RECORDS[0].id);
                  else if (tab === "TRAILS") setSelectedId(ENGINE_TRAILS_RECORDS[0].id);
                  else if (tab === "THEMES") setSelectedId(SPEEDWAY_THEMES_RECORDS[0].id);
                }}
                className={`flex-1 py-3 font-mono text-[10px] md:text-xs tracking-widest uppercase text-center rounded-xl transition cursor-pointer ${
                  activeTab === tab 
                    ? "bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-extrabold shadow-md shadow-pink-500/25" 
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50"
                }`}
              >
                {tab === "CHARACTERS" ? "🏍️ RIDER MOTOR GIRLS" : tab === "TRAILS" ? "☄️ ENGINE PARTILE TRAILS" : "🌅 RACING SPEEDWAYS"}
              </button>
            ))}
          </div>

          {/* Roster scroll list */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 max-h-[420px] custom-scrollbar-thin">
            
            {activeTab === "CHARACTERS" && MOTOR_GIRLS_RECORDS.map(m => {
              const isUnlocked = profile.unlockedCharacters.includes(m.id);
              const isEquipped = profile.equippedCharacterId === m.id;
              const isSelected = selectedId === m.id;

              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  style={{ borderColor: isSelected ? m.primaryColor : undefined }}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                    isSelected 
                      ? "bg-neutral-800/80 border-2" 
                      : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50"
                  }`}
                >
                  {isEquipped && (
                    <span className="absolute top-3 right-3 bg-green-500/20 border border-green-500/30 text-green-400 text-[8px] font-mono font-black py-0.5 px-2 rounded-full uppercase">
                      ACTIVE
                    </span>
                  )}

                  <div>
                    <span className="font-mono text-[9px] text-neutral-500 uppercase block tracking-widest">{m.tagline}</span>
                    <h3 className="text-sm font-black text-white uppercase mt-1 leading-none group-hover:text-pink-400 transition-colors">{m.name}</h3>
                    <p className="font-mono text-[11px] text-neutral-400 block mt-2.5 leading-snug line-clamp-2">{m.description}</p>
                  </div>

                  <div className="flex justify-between items-center mt-4.5 pt-3 border-t border-neutral-800/50 w-full font-mono text-[10px]">
                    <span className="text-neutral-500 uppercase">Style: <strong className="text-white">{m.bikeStyle}</strong></span>
                    {isUnlocked ? (
                      <span className="text-green-400 font-extrabold flex items-center gap-1">
                        <Check size={11} className="stroke-[3]" /> OWNED
                      </span>
                    ) : (
                      <span className="text-yellow-400 font-black">🪙 {m.cost} G-Coins</span>
                    )}
                  </div>
                </button>
              );
            })}

            {activeTab === "TRAILS" && ENGINE_TRAILS_RECORDS.map(t => {
              const isUnlocked = profile.unlockedTrails.includes(t.id);
              const isEquipped = profile.equippedTrailId === t.id;
              const isSelected = selectedId === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                    isSelected 
                      ? "bg-neutral-800/80 border-pink-500 border-2" 
                      : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50"
                  }`}
                >
                  {isEquipped && (
                    <span className="absolute top-3 right-3 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[8px] font-mono font-black py-0.5 px-2 rounded-full uppercase">
                      ACTIVE
                    </span>
                  )}

                  <div>
                    <span className="font-mono text-[9px] text-neutral-500 uppercase block tracking-widest">{t.type} Style FX</span>
                    <h3 className="text-sm font-black text-white uppercase mt-1 leading-none group-hover:text-pink-400 transition-colors">{t.name}</h3>
                    <p className="font-mono text-[11px] text-neutral-400 block mt-2.5 leading-snug line-clamp-2">{t.description}</p>
                  </div>

                  <div className="flex justify-between items-center mt-4.5 pt-3 border-t border-neutral-800/50 w-full font-mono text-[10px]">
                    <div className="flex items-center gap-1">
                      {t.colors.map(c => (
                        <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    {isUnlocked ? (
                      <span className="text-green-400 font-extrabold flex items-center gap-1">
                        <Check size={11} className="stroke-[3]" /> OWNED
                      </span>
                    ) : (
                      <span className="text-yellow-400 font-black">🪙 {t.cost} G-Coins</span>
                    )}
                  </div>
                </button>
              );
            })}

            {activeTab === "THEMES" && SPEEDWAY_THEMES_RECORDS.map(v => {
              const isUnlocked = profile.unlockedThemes.includes(v.id);
              const isEquipped = profile.equippedThemeId === v.id;
              const isSelected = selectedId === v.id;

              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                    isSelected 
                      ? "bg-neutral-800/80 border-pink-500 border-2" 
                      : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50"
                  }`}
                >
                  {isEquipped && (
                    <span className="absolute top-3 right-3 bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[8px] font-mono font-black py-0.5 px-2 rounded-full uppercase">
                      ACTIVE
                    </span>
                  )}

                  <div>
                    <span className="font-mono text-[9px] text-neutral-500 uppercase block tracking-widest">Environment asphalt</span>
                    <h3 className="text-sm font-black text-white uppercase mt-1 leading-none group-hover:text-pink-400 transition-colors">{v.name}</h3>
                    <p className="font-mono text-[11px] text-neutral-400 block mt-2.5 leading-snug line-clamp-2">{v.description}</p>
                  </div>

                  <div className="flex justify-between items-center mt-4.5 pt-3 border-t border-neutral-800/50 w-full font-mono text-[10px]">
                    <span className="text-neutral-500 uppercase">Zone Map</span>
                    {isUnlocked ? (
                      <span className="text-green-400 font-extrabold flex items-center gap-1">
                        <Check size={11} className="stroke-[3]" /> OWNED
                      </span>
                    ) : (
                      <span className="text-yellow-400 font-black">🪙 {v.cost} G-Coins</span>
                    )}
                  </div>
                </button>
              );
            })}

          </div>
        </div>

        {/* Right Column: Visual Showcase Preview Panel (4 columns) */}
        <div className="lg:col-span-4 bg-neutral-950/80 border border-neutral-800 p-5 rounded-3xl flex flex-col justify-between relative overflow-hidden md:min-h-[400px]">
          
          <div className="space-y-5">
            <h4 className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest">
              ⚡ LIVE STAGE SHOWROOM INSPECTION
            </h4>

            {/* Immersive 3D Grid Stage */}
            <div className="h-44 bg-black rounded-2xl border border-neutral-800 relative overflow-hidden flex flex-col items-center justify-center">
              {/* Retro speedlines backing */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(circle,black_50%,transparent_100%)] opacity-35" />
              
              {/* Atmosphere background flare */}
              <div 
                className="absolute inset-0 transition-all duration-700 opacity-40 blur-2xl" 
                style={{ 
                  backgroundColor: activeTab === "CHARACTERS" 
                    ? activeMotorConfig.primaryColor 
                    : activeTab === "TRAILS"
                      ? ENGINE_TRAILS_RECORDS.find(t => t.id === selectedId)?.colors[0] || "#E74C3C"
                      : SPEEDWAY_THEMES_RECORDS.find(v => v.id === selectedId)?.mountainColor || "#1F618D"
                }} 
              />
              
              {/* Floating Bike representation */}
              <div className="relative animate-bounce w-28 h-14 flex items-center justify-center z-10" style={{ animationDuration: "3.5s" }}>
                <div 
                  className="w-16 h-10 border-2 rounded-xl bg-neutral-900 flex flex-col justify-center items-center relative shadow-[0_12px_24px_rgba(0,0,0,0.5)]" 
                  style={{ borderColor: activeTab === "CHARACTERS" ? activeMotorConfig.primaryColor : "#FFFF00" }}
                >
                  <span className="text-lg leading-none">🏍️</span>
                  <span className="text-[7.5px] font-mono text-neutral-400 font-extrabold uppercase mt-1">
                    {selectedId}
                  </span>
                  {/* Wheels spinning effect */}
                  <div className="absolute -bottom-1 -left-2 w-5 h-5 rounded-full border-2 border-dashed border-cyan-400/80 animate-spin bg-neutral-950" style={{ animationDuration: "0.8s" }} />
                  <div className="absolute -bottom-1 -right-2 w-5 h-5 rounded-full border-2 border-dashed border-cyan-400/80 animate-spin bg-neutral-950" style={{ animationDuration: "0.8s" }} />
                </div>
              </div>

              {/* Pedestal Stand */}
              <div className="absolute bottom-4 w-32 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent rounded-full shadow-[0_4px_10px_rgba(6,182,212,0.5)]" />
              <div className="absolute bottom-1 font-mono text-[8.5px] text-neutral-500 uppercase tracking-widest">
                PREVIEWING SELECTION
              </div>
            </div>

            {/* Item Details */}
            <div className="text-left space-y-2">
              <h3 className="text-base font-black text-white italic tracking-wide uppercase leading-none">
                {activeTab === "CHARACTERS" ? activeMotorConfig.name : selectedId.replace(/_/g, " ")}
              </h3>
              <p className="font-mono text-[9px] text-pink-500 uppercase font-black tracking-widest">
                {activeTab === "CHARACTERS" ? activeMotorConfig.tagline : activeTab === "TRAILS" ? "Exhuast Particle emitter" : "Environmental Asphalt"}
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans pt-1">
                {activeTab === "CHARACTERS" 
                  ? activeMotorConfig.description 
                  : activeTab === "TRAILS"
                    ? ENGINE_TRAILS_RECORDS.find(t => t.id === selectedId)?.description
                    : SPEEDWAY_THEMES_RECORDS.find(v => v.id === selectedId)?.description}
              </p>
            </div>
          </div>

          <div className="pt-6">
            {activeTab === "CHARACTERS" && (() => {
              const isUnlocked = profile.unlockedCharacters.includes(activeMotorConfig.id);
              const isEquipped = profile.equippedCharacterId === activeMotorConfig.id;

              return isUnlocked ? (
                isEquipped ? (
                  <div className="w-full py-3 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[10px] font-black rounded-2xl text-center uppercase tracking-widest flex items-center justify-center gap-2">
                    <Check size={14} className="stroke-[3]" /> Active Rider Selected
                  </div>
                ) : (
                  <button
                    onClick={() => handleEquipItem(activeMotorConfig.id, "CHARACTERS")}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-black rounded-2xl transition cursor-pointer tracking-widest uppercase shadow-[0_5px_15px_rgba(219,39,119,0.3)] hover:scale-101"
                  >
                    EQUIP RIDER SKIN
                  </button>
                )
              ) : (
                <button
                  onClick={() => handlePurchaseItem(activeMotorConfig.id, activeMotorConfig.cost, "CHARACTERS")}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-neutral-950 font-mono text-[10px] font-black rounded-2xl transition cursor-pointer tracking-widest uppercase hover:scale-101"
                >
                  UNLOCK LICENSE (🪙 {activeMotorConfig.cost})
                </button>
              );
            })()}

            {activeTab === "TRAILS" && (() => {
              const t = ENGINE_TRAILS_RECORDS.find(trail => trail.id === selectedId) || ENGINE_TRAILS_RECORDS[0];
              const isUnlocked = profile.unlockedTrails.includes(t.id);
              const isEquipped = profile.equippedTrailId === t.id;

              return isUnlocked ? (
                isEquipped ? (
                  <div className="w-full py-3 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[10px] font-black rounded-2xl text-center uppercase tracking-widest flex items-center justify-center gap-2">
                    <Check size={14} className="stroke-[3]" /> Nitro Exhaust Style Active
                  </div>
                ) : (
                  <button
                    onClick={() => handleEquipItem(t.id, "TRAILS")}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-black rounded-2xl transition cursor-pointer tracking-widest uppercase shadow-[0_5px_15px_rgba(219,39,119,0.3)] hover:scale-101"
                  >
                    EQUIP NITRO EXHAUST
                  </button>
                )
              ) : (
                <button
                  onClick={() => handlePurchaseItem(t.id, t.cost, "TRAILS")}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-neutral-950 font-mono text-[10px] font-black rounded-2xl transition cursor-pointer tracking-widest uppercase hover:scale-101"
                >
                  UNLOCK EMITTER (🪙 {t.cost})
                </button>
              );
            })()}

            {activeTab === "THEMES" && (() => {
              const v = SPEEDWAY_THEMES_RECORDS.find(theme => theme.id === selectedId) || SPEEDWAY_THEMES_RECORDS[0];
              const isUnlocked = profile.unlockedThemes.includes(v.id);
              const isEquipped = profile.equippedThemeId === v.id;

              return isUnlocked ? (
                isEquipped ? (
                  <div className="w-full py-3 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[10px] font-black rounded-2xl text-center uppercase tracking-widest flex items-center justify-center gap-2">
                    <Check size={14} className="stroke-[3]" /> Environment Map Active
                  </div>
                ) : (
                  <button
                    onClick={() => handleEquipItem(v.id, "THEMES")}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[10px] font-black rounded-2xl transition cursor-pointer tracking-widest uppercase shadow-[0_5px_15px_rgba(219,39,119,0.3)] hover:scale-101"
                  >
                    APPLY Speedway ZONE
                  </button>
                )
              ) : (
                <button
                  onClick={() => handlePurchaseItem(v.id, v.cost, "THEMES")}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-neutral-950 font-mono text-[10px] font-black rounded-2xl transition cursor-pointer tracking-widest uppercase hover:scale-101"
                >
                  ACQUIRE TRACK ACCESS (🪙 {v.cost})
                </button>
              );
            })()}
          </div>

        </div>

      </div>

    </div>
  );
}
