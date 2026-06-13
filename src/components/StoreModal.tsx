import { useState } from "react";
import { UserProfile, MotorGirlSkin, EngineTrailStyle, SpeedwayThemeStyle } from "../types";
import { MOTOR_GIRLS_RECORDS, ENGINE_TRAILS_RECORDS, SPEEDWAY_THEMES_RECORDS } from "../data";
import { retroAudio } from "../audio";
import { Sparkles, Coins, Check, Lock, Bike, Wind, Palette, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StoreModalProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onClose: () => void;
}

type StoreTab = "CHARACTERS" | "TRAILS" | "THEMES";

export default function StoreModal({ profile, onUpdateProfile, onClose }: StoreModalProps) {
  const [activeTab, setActiveTab] = useState<StoreTab>("CHARACTERS");
  const [selectedId, setSelectedId] = useState<string>("HARAJUKU");
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const activeMotorConfig = MOTOR_GIRLS_RECORDS.find(m => m.id === selectedId) || MOTOR_GIRLS_RECORDS[0];

  const handlePurchaseItem = (id: string, cost: number, category: StoreTab) => {
    if (profile.totalCoins < cost) {
      // play minor buzzer / fail sound
      retroAudio.playGameOver();
      alert("Insufficient Golds! Play more speedways to collect coins.");
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
    setPurchaseSuccess(`Unlocked successfully!`);
    setTimeout(() => setPurchaseSuccess(null), 2500);
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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-40 p-4 font-sans select-none">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-neutral-900 w-full max-w-[500px] h-[600px] border border-neutral-800 rounded-3xl flex flex-col justify-between overflow-hidden shadow-2xl relative"
      >
        
        {/* Dynamic header */}
        <header className="p-4 border-b border-neutral-800/80 flex justify-between items-center bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-500/10 p-1.5 rounded-xl border border-yellow-500/30 text-yellow-400">
              <Coins size={16} className="animate-spin" style={{ animationDuration: "3s" }} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-widest text-pink-500 uppercase">
                SPEEDWAY GARAGE
              </h2>
              <div className="flex items-center gap-1 font-mono text-[10px] text-yellow-400 font-bold uppercase">
                <span>Your Bank:</span>
                <span>🪙 {profile.totalCoins}</span>
              </div>
            </div>
          </div>
          
          <button 
            id="close-garage"
            onClick={onClose}
            className="p-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-805 rounded-xl text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </header>

        {/* Tab switcher */}
        <nav className="flex px-4 pt-3 border-b border-neutral-800/50 bg-neutral-950/20 gap-2">
          {(["CHARACTERS", "TRAILS", "THEMES"] as StoreTab[]).map(tab => (
            <button
              id={`tab-${tab.toLowerCase()}`}
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                // default selection to first element in that tab roster
                if (tab === "CHARACTERS") setSelectedId(MOTOR_GIRLS_RECORDS[0].id);
                else if (tab === "TRAILS") setSelectedId(ENGINE_TRAILS_RECORDS[0].id);
                else if (tab === "THEMES") setSelectedId(SPEEDWAY_THEMES_RECORDS[0].id);
              }}
              className={`flex-1 py-2 font-mono text-[9px] tracking-widest uppercase text-center border-b-2 transition ${activeTab === tab ? "text-pink-500 border-pink-500 font-extrabold" : "text-neutral-400 border-transparent hover:text-neutral-200"}`}
            >
              {tab === "CHARACTERS" ? "Motor Girls" : tab === "TRAILS" ? "Nitro Trails" : "Environments"}
            </button>
          ))}
        </nav>

        {/* Purchase confetti banners */}
        {purchaseSuccess && (
          <div className="absolute top-16 inset-x-4 bg-green-500/90 text-white font-mono text-[10px] py-2 px-3 rounded-xl text-center shadow-lg animate-bounce z-50">
            🎉 {purchaseSuccess}
          </div>
        )}

        {/* Primary split grid */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-neutral-950/10">
          
          {/* Left Column: List Scrolling */}
          <section className="w-[180px] border-r border-neutral-800/80 overflow-y-auto p-3 space-y-2 bg-neutral-950/20">
            {activeTab === "CHARACTERS" && MOTOR_GIRLS_RECORDS.map(m => {
              const isUnlocked = profile.unlockedCharacters.includes(m.id);
              const isEquipped = profile.equippedCharacterId === m.id;
              return (
                <button
                  id={`item-${m.id}`}
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${selectedId === m.id ? "bg-neutral-800/80 border-pink-500" : "bg-neutral-900 border-neutral-800/60 hover:bg-neutral-800/40"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-white leading-tight truncate">{m.name}</span>
                    {isEquipped && <Check size={11} className="text-green-400 shrink-0" />}
                  </div>
                  <div className="flex justify-between items-center mt-1.5 w-full font-mono text-[8.5px] uppercase">
                    <span className="text-neutral-500">{m.tagline}</span>
                    {isUnlocked ? (
                      <span className="text-green-500 font-extrabold text-[8px]">Owned</span>
                    ) : (
                      <span className="text-yellow-400 font-extrabold leading-none">🪙 {m.cost}</span>
                    )}
                  </div>
                </button>
              );
            })}

            {activeTab === "TRAILS" && ENGINE_TRAILS_RECORDS.map(t => {
              const isUnlocked = profile.unlockedTrails.includes(t.id);
              const isEquipped = profile.equippedTrailId === t.id;
              return (
                <button
                  id={`item-${t.id}`}
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${selectedId === t.id ? "bg-neutral-800/80 border-pink-500" : "bg-neutral-900 border-neutral-800/60 hover:bg-neutral-800/40"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-white leading-tight truncate">{t.name}</span>
                    {isEquipped && <Check size={11} className="text-green-400 shrink-0" />}
                  </div>
                  <div className="flex justify-between items-center mt-1.5 w-full font-mono text-[8.5px] uppercase">
                    <span className="text-neutral-500">{t.type}</span>
                    {isUnlocked ? (
                      <span className="text-green-500 font-extrabold text-[8px]">Owned</span>
                    ) : (
                      <span className="text-yellow-400 font-extrabold leading-none">🪙 {t.cost}</span>
                    )}
                  </div>
                </button>
              );
            })}

            {activeTab === "THEMES" && SPEEDWAY_THEMES_RECORDS.map(v => {
              const isUnlocked = profile.unlockedThemes.includes(v.id);
              const isEquipped = profile.equippedThemeId === v.id;
              return (
                <button
                  id={`item-${v.id}`}
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${selectedId === v.id ? "bg-neutral-800/80 border-pink-500" : "bg-neutral-900 border-neutral-800/60 hover:bg-neutral-800/40"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-white leading-tight truncate">{v.name}</span>
                    {isEquipped && <Check size={11} className="text-green-400 shrink-0" />}
                  </div>
                  <div className="flex justify-between items-center mt-1.5 w-full font-mono text-[8.5px] uppercase">
                    <span className="text-neutral-500">Speedway</span>
                    {isUnlocked ? (
                      <span className="text-green-500 font-extrabold text-[8px]">Owned</span>
                    ) : (
                      <span className="text-yellow-400 font-extrabold leading-none">🪙 {v.cost}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </section>

          {/* Right Column: Visual Detailed Preview Inspector */}
          <section className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
            {activeTab === "CHARACTERS" && (
              <div className="flex-1 flex flex-col justify-between min-h-0">
                <div className="space-y-3.5">
                  {/* Decorative Preview Stage Canvas */}
                  <div className="h-32 bg-neutral-950 rounded-2xl border border-neutral-805 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-radial from-neutral-850 to-neutral-950 opacity-55" />
                    <div className="absolute bottom-0 inset-x-0 h-4 bg-neutral-900 border-t border-neutral-800" />
                    
                    {/* Character Bike vector graphic loader */}
                    <div className="relative animate-bounce w-20 h-10 flex items-center justify-center">
                      <div className="w-14 h-8 rounded-lg flex items-center justify-center bg-neutral-900 border border-neutral-800 relative shadow-md" style={{ borderColor: activeMotorConfig.primaryColor }}>
                        {/* Wheels visual spinning */}
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-neutral-900 border-2" style={{ borderColor: activeMotorConfig.secondaryColor, animation: "spin 1s linear infinite" }} />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 border-2" style={{ borderColor: activeMotorConfig.secondaryColor, animation: "spin 1s linear infinite" }} />
                        <div className="w-2.5 h-2.5 rounded-full absolute -top-2 right-2 bg-neutral-950 border-2" style={{ borderColor: activeMotorConfig.helmetColor }} />
                        <div className="absolute text-[6px] font-mono top-1 font-black text-center text-white truncate px-1">
                          {activeMotorConfig.id}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black tracking-widest text-pink-500 uppercase">{activeMotorConfig.name}</h3>
                    <p className="font-mono text-[8px] text-neutral-500 uppercase mt-0.5 tracking-widest">{activeMotorConfig.tagline}</p>
                    <p className="font-mono text-[10px] text-neutral-400 leading-normal mt-2">
                      {activeMotorConfig.description}
                    </p>
                  </div>

                  {/* Character attributes list */}
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono uppercase bg-neutral-950/40 p-2 rounded-xl">
                    <div className="flex gap-1 items-center">
                      <Palette size={11} className="text-pink-500" />
                      <span className="text-neutral-500">Primary:</span>
                      <span style={{ color: activeMotorConfig.primaryColor }} className="font-bold">■</span>
                    </div>
                    <div className="flex gap-1 items-center">
                      <Wind size={11} className="text-cyan-400" />
                      <span className="text-neutral-500">Bike Style:</span>
                      <span className="text-white font-bold">{activeMotorConfig.bikeStyle}</span>
                    </div>
                  </div>
                </div>

                {/* Operations triggering buttons block */}
                <div className="pt-4">
                  {profile.unlockedCharacters.includes(activeMotorConfig.id) ? (
                    profile.equippedCharacterId === activeMotorConfig.id ? (
                      <div className="w-full py-2 bg-green-500/10 border border-green-500/20 rounded-xl font-mono text-[10px] text-green-400 font-bold uppercase text-center flex items-center justify-center gap-1.5">
                        <Check size={11} className="stroke-[3]" /> Selected Speedway Driver
                      </div>
                    ) : (
                      <button
                        id={`equip-${activeMotorConfig.id}`}
                        onClick={() => handleEquipItem(activeMotorConfig.id, "CHARACTERS")}
                        className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-[10px] font-mono tracking-widest uppercase rounded-xl transition cursor-pointer"
                      >
                        EQUIP RIDER
                      </button>
                    )
                  ) : (
                    <button
                      id={`buy-${activeMotorConfig.id}`}
                      onClick={() => handlePurchaseItem(activeMotorConfig.id, activeMotorConfig.cost, "CHARACTERS")}
                      className="w-full py-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 font-bold text-[10px] font-mono tracking-widest uppercase rounded-xl text-neutral-950 transition cursor-pointer"
                    >
                      LICENSE BIKE (🪙 {activeMotorConfig.cost})
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === "TRAILS" && (() => {
              const t = ENGINE_TRAILS_RECORDS.find(item => item.id === selectedId) || ENGINE_TRAILS_RECORDS[0];
              const isUnlocked = profile.unlockedTrails.includes(t.id);
              const isEquipped = profile.equippedTrailId === t.id;
              return (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="space-y-3 px-1">
                    <div>
                      <h3 className="text-xs font-black tracking-widest text-pink-500 uppercase">{t.name}</h3>
                      <p className="font-mono text-[8.5px] text-neutral-500 uppercase tracking-widest mt-0.5">{t.type} particle custom engine stream</p>
                      <p className="font-mono text-[10px] text-neutral-400 leading-normal mt-3">
                        {t.description}
                      </p>
                    </div>

                    <div className="flex gap-2.5 items-center mt-4 text-[9px] font-mono uppercase bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-900">
                      <span className="text-neutral-500">Colors:</span>
                      <div className="flex gap-1.5">
                        {t.colors.map(c => (
                          <span key={c} style={{ color: c }} className="font-black text-xs leading-none">⬤</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    {isUnlocked ? (
                      isEquipped ? (
                        <div className="w-full py-2 bg-green-500/10 border border-green-500/20 rounded-xl font-mono text-[10px] text-green-400 font-bold uppercase text-center flex items-center justify-center gap-1.5">
                          <Check size={11} className="stroke-[3]" /> Active Engine Exhuast Style
                        </div>
                      ) : (
                        <button
                          id={`equip-${t.id}`}
                          onClick={() => handleEquipItem(t.id, "TRAILS")}
                          className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-[10px] font-mono tracking-widest uppercase rounded-xl transition cursor-pointer"
                        >
                          EQUIP NITRO TRAIL
                        </button>
                      )
                    ) : (
                      <button
                        id={`buy-${t.id}`}
                        onClick={() => handlePurchaseItem(t.id, t.cost, "TRAILS")}
                        className="w-full py-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 font-bold text-[10px] font-mono tracking-widest uppercase rounded-xl text-neutral-950 transition cursor-pointer"
                      >
                        UNLOCK FX (🪙 {t.cost})
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {activeTab === "THEMES" && (() => {
              const v = SPEEDWAY_THEMES_RECORDS.find(item => item.id === selectedId) || SPEEDWAY_THEMES_RECORDS[0];
              const isUnlocked = profile.unlockedThemes.includes(v.id);
              const isEquipped = profile.equippedThemeId === v.id;
              return (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="space-y-3 px-1">
                    <div>
                      <h3 className="text-xs font-black tracking-widest text-pink-500 uppercase">{v.name}</h3>
                      <p className="font-mono text-[8.5px] text-neutral-500 uppercase tracking-widest mt-0.5">Atmospheric Speedways Environment</p>
                      <p className="font-mono text-[10px] text-neutral-400 leading-normal mt-3">
                        {v.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 mt-4 text-[9px] font-mono uppercase bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-900">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Asphalt Speedway Color:</span>
                        <span style={{ color: v.speedwayFloorColor }} className="font-black text-xs">■</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Scenery Backdrop Cover:</span>
                        <span style={{ color: v.mountainColor }} className="font-black text-xs">■</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    {isUnlocked ? (
                      isEquipped ? (
                        <div className="w-full py-2 bg-green-500/10 border border-green-505/20 rounded-xl font-mono text-[10px] text-green-400 font-bold uppercase text-center flex items-center justify-center gap-1.5">
                          <Check size={11} className="stroke-[3]" /> Current Racing Speedway active
                        </div>
                      ) : (
                        <button
                          id={`equip-${v.id}`}
                          onClick={() => handleEquipItem(v.id, "THEMES")}
                          className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-[10px] font-mono tracking-widest uppercase rounded-xl transition cursor-pointer"
                        >
                          SET SPEEDWAY
                        </button>
                      )
                    ) : (
                      <button
                        id={`buy-${v.id}`}
                        onClick={() => handlePurchaseItem(v.id, v.cost, "THEMES")}
                        className="w-full py-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 font-bold text-[10px] font-mono tracking-widest uppercase rounded-xl text-neutral-950 transition cursor-pointer"
                      >
                        UNLOCK ZONE (🪙 {v.cost})
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

          </section>

        </div>

      </motion.div>
    </div>
  );
}
