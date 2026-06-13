import { useState, useEffect } from "react";
import GameCanvas from "./components/GameCanvas";
import SplashView from "./components/SplashView";
import LoginView from "./components/LoginView";
import DashboardView from "./components/DashboardView";
import StoreModal from "./components/StoreModal";
import ArcadeSettingsPanel from "./components/ArcadeSettingsPanel";
import { UserProfile } from "./types";
import { loadUserProfile, saveUserProfile, processXpReward, auditAndUnlockAchievements, updateQuestsOnGameRun } from "./lib/progressDb";
import { auth, onAuthStateChanged, signOut, isMockFirebase } from "./lib/firebase";
import { retroAudio } from "./audio";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Gamepad2, Coins, Trophy, Calendar, Award, User, LogOut, 
  Settings, Volume2, VolumeX, Share2, Globe, Heart, ShieldCheck, Play, Lock
} from "lucide-react";
import { 
  RewardsCalendarWidget, StandingsWidget, MissionCenterWidget, 
  AchievementsShowcaseWidget, SocialArenaWidget, PwaSyncWidget, AdRewardWidget
} from "./components/PortalWidgets";

type ViewState = "SPLASH" | "AUTH" | "DASHBOARD" | "GAMEPLAY";

export default function App() {
  const [view, setView] = useState<ViewState>("SPLASH");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Dialog Open states
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isPublishingOpen, setIsPublishingOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Level Up Congratulations overlays state
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);

  // For responsive layout elements (passive 3D background coordinate tracking)
  const [mouseCoord, setMouseCoord] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMouseCoord({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Monitor Auth Changes
  useEffect(() => {
    if (isMockFirebase) {
      const activeUserUid = localStorage.getItem("motorgirl_active_uid");
      if (activeUserUid) {
        loadUserProfile(activeUserUid).then(p => {
          setProfile(p);
        });
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const p = await loadUserProfile(user.uid, user.email || "");
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync mute values
  useEffect(() => {
    retroAudio.setMute(isAudioMuted);
  }, [isAudioMuted]);

  const handleSplashComplete = () => {
    const activeUid = isMockFirebase ? localStorage.getItem("motorgirl_active_uid") : auth.currentUser?.uid;
    if (profile || activeUid) {
      setView("DASHBOARD");
    } else {
      setView("AUTH");
    }
  };

  const handleLoginSuccess = async (email: string, username: string, isAnon: boolean) => {
    let mockUid = `mock_uid_${Math.floor(1000 + Math.random() * 9000)}`;
    
    if (isMockFirebase || isAnon) {
      localStorage.setItem("motorgirl_active_uid", mockUid);
      const guestProfile = await loadUserProfile(mockUid, email);
      guestProfile.username = username;
      guestProfile.isAnonymous = isAnon;
      await saveUserProfile(guestProfile);
      setProfile(guestProfile);
      setView("DASHBOARD");
    } else {
      const verifiedUid = `racer_uid_${email.replace(/[@.]/g, "_")}`;
      const cloudProfile = await loadUserProfile(verifiedUid, email);
      cloudProfile.username = username;
      cloudProfile.isAnonymous = false;
      await saveUserProfile(cloudProfile);
      setProfile(cloudProfile);
      setView("DASHBOARD");
    }
  };

  const handleSignOut = async () => {
    try {
      if (!isMockFirebase) {
        await signOut(auth);
      }
      localStorage.removeItem("motorgirl_active_uid");
      setProfile(null);
      setView("AUTH");
    } catch (e) {
      console.warn("Sign out issue:", e);
    }
  };

  const handleUpdateProfile = async (updated: UserProfile) => {
    setProfile(updated);
    await saveUserProfile(updated);
  };

  const handleGameFinished = async (score: number, coinsCollected: number) => {
    if (!profile) return;

    let updated = { ...profile };

    updated.totalCoins += coinsCollected;
    updated.coinsCollectedTotal += coinsCollected;
    updated.obstaclesPassedTotal += score;
    updated.totalGames += 1;
    if (score > updated.highScore) {
      updated.highScore = score;
    }

    const xpReward = (score * 8) + (coinsCollected * 5);
    const { profile: xpProfile, leveledUp, unlockedItems } = processXpReward(updated, xpReward);
    updated = xpProfile;

    updateQuestsOnGameRun(score, coinsCollected);

    const { updatedProfile, newlyUnlocked } = auditAndUnlockAchievements(updated);
    updated = updatedProfile;

    setProfile(updated);
    await saveUserProfile(updated);

    if (leveledUp) {
      retroAudio.playPoint();
      setLevelUpMessage(`LEVEL UP! You reached Rank ${updated.level}!`);
      setTimeout(() => setLevelUpMessage(null), 4000);
    } else if (newlyUnlocked.length > 0) {
      retroAudio.playPoint();
      setLevelUpMessage(`🏆 ACHIEVEMENT: "${newlyUnlocked[0]}" Unlocked!`);
      setTimeout(() => setLevelUpMessage(null), 4000);
    }

    setView("DASHBOARD");
  };

  // Helper inside PWA flow for ad crediting
  const handleCreditAdCoins = (amount: number) => {
    if (!profile) return;
    const updated = { ...profile };
    updated.totalCoins += amount;
    handleUpdateProfile(updated);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col font-sans select-none overflow-x-hidden relative">
      
      {/* 🔮 1. HIGH-FIDELITY PARALLAX 3D BACKDROP */}
      <div 
        className="absolute inset-0 pointer-events-none transition-transform duration-300 ease-out z-0"
        style={{
          transform: `translate3d(${mouseCoord.x}px, ${mouseCoord.y}px, 0)`,
          background: "radial-gradient(circle at 45% 25%, rgba(236, 72, 153, 0.12) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.12) 0%, transparent 45%)"
        }}
      />
      
      {/* Speedway matrix grid layer */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(95deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-30 z-0" />
      
      {/* 3D floating orb elements */}
      <div className="absolute top-[20%] left-[5%] w-72 h-72 bg-gradient-to-tr from-pink-500/10 to-transparent rounded-full blur-[80px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[15%] right-[8%] w-96 h-96 bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-full blur-[100px] pointer-events-none" />

      {/* 🖥️ 2. UPPER NAVBAR HEADER */}
      <header className="sticky top-0 z-30 bg-neutral-950/85 backdrop-blur-md border-b border-neutral-900 px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Animated Branding */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-pink-500 to-indigo-500 p-2.5 rounded-2xl border border-pink-400/20 shadow-[0_0_15px_rgba(236,72,153,0.3)] shrink-0">
              <Gamepad2 className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div className="text-left select-none">
              <h1 className="text-sm font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 uppercase leading-none">
                MOTORSPEEDWAY
              </h1>
              <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase block mt-1">
                Professional Play Portal • 2.5D Arcade Edition
              </span>
            </div>
          </div>

          {/* User information panel or prompt */}
          <div className="flex items-center gap-3.5">
            {profile ? (
              <div className="flex items-center gap-3 bg-neutral-900/80 border border-neutral-800/80 rounded-2xl px-3 py-1.5 shadow-md">
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500/20 to-indigo-500/20 border border-neutral-700 flex items-center justify-center text-base">
                    {profile.avatarId === "avatar_2" ? "👩‍🎤" : profile.avatarId === "avatar_3" ? "👩‍🚀" : profile.avatarId === "avatar_4" ? "👸" : profile.avatarId === "avatar_5" ? "🦊" : "🏍️"}
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-pink-500 text-white font-mono text-[7px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-black leading-none">
                    {profile.level}
                  </span>
                </div>
                <div className="hidden sm:block text-left min-w-[70px]">
                  <div className="text-xs font-bold text-white truncate max-w-[100px]">{profile.username}</div>
                  <div className="flex items-center gap-1.5 mt-0.5" title="Currency balance">
                    <Coins className="w-3 h-3 text-yellow-400 shrink-0" />
                    <span className="font-mono text-[10px] text-yellow-400 font-extrabold">{profile.totalCoins}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex gap-1 items-center bg-pink-500/5 px-3 py-1.5 rounded-xl border border-pink-500/10 text-pink-400 text-[10px] font-mono uppercase tracking-wider">
                <ShieldCheck size={11} className="text-pink-400 shrink-0" />
                Guest Mode Driving Active
              </div>
            )}

            {/* Global controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className="p-2 bg-neutral-900 border border-neutral-800 hover:border-pink-500/30 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-sm"
                title={isAudioMuted ? "Unmute Volume" : "Mute Volume"}
              >
                {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              <button
                onClick={() => setIsPublishingOpen(true)}
                className="p-2 bg-neutral-900 border border-neutral-800 hover:border-pink-500/30 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Google Play Blueprint Manual"
              >
                <Settings size={14} />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* 🚀 3. CENTRAL WORKSPACE LAYOUT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 relative">
        
        {/* ================= LEFT SECTION: MAIN ARCADE CONSOLE ================= */}
        <section className="lg:col-span-7 xl:col-span-7 flex flex-col items-center justify-start">
          
          {/* Animated Big Logo banner for homepage view */}
          {view === "AUTH" && (
            <div className="mb-6 text-center select-none animate-pulse" style={{ animationDuration: "4s" }}>
              <div className="inline-block bg-pink-500/5 px-4 py-1 rounded-full border border-pink-500/15 mb-2.5">
                <span className="font-mono text-[9px] text-pink-400 font-black tracking-[0.25em] uppercase">
                  ⚡ 3D Cyber Racing Speedway
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-neutral-400 uppercase leading-none">
                DRIVE SPEEDWAY
              </h2>
              <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                Glide over obstacles • Collect coins • Customize bikes in the garage
              </p>
            </div>
          )}

          {/* 🕹️ The Arcade Cabinet frame mockup holding active view */}
          <div className="w-full max-w-[490px] bg-neutral-950 rounded-[3rem] border-[10px] border-neutral-900 p-2 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden transition-all duration-300">
            
            {/* Top arcade speaker grill bar overlay */}
            <div className="absolute top-1.5 inset-x-0 h-4 flex items-center justify-center gap-1 opacity-25 z-20">
              <span className="w-24 h-0.5 bg-neutral-800 rounded-full" />
              <span className="w-1.5 h-1.5 bg-neutral-800 rounded-full" />
              <span className="w-24 h-0.5 bg-neutral-800 rounded-full" />
            </div>

            {/* Inner responsive frame styling */}
            <div className="w-full aspect-[480/640] rounded-[2.5rem] bg-black overflow-hidden relative border border-neutral-950">
              
              <AnimatePresence mode="wait">
                {view === "SPLASH" && (
                  <motion.div 
                    key="splash" 
                    exit={{ opacity: 0 }} 
                    transition={{ duration: 0.35 }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <SplashView onComplete={handleSplashComplete} />
                  </motion.div>
                )}

                {view === "AUTH" && (
                  <motion.div 
                    key="auth" 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <LoginView onLoginSuccess={handleLoginSuccess} />
                  </motion.div>
                )}

                {view === "DASHBOARD" && profile && (
                  <motion.div 
                    key="dashboard"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <DashboardView
                      profile={profile}
                      onUpdateProfile={handleUpdateProfile}
                      onLaunchGame={() => setView("GAMEPLAY")}
                      onOpenStore={() => setIsStoreOpen(true)}
                      onOpenPublishingPanel={() => setIsPublishingOpen(true)}
                      isAudioMuted={isAudioMuted}
                      onMuteToggle={() => setIsAudioMuted(!isAudioMuted)}
                      onSignOut={handleSignOut}
                    />
                  </motion.div>
                )}

                {view === "GAMEPLAY" && profile && (
                  <motion.div 
                    key="gameplay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <GameCanvas 
                      equippedCharacterId={profile.equippedCharacterId}
                      equippedTrailId={profile.equippedTrailId}
                      equippedThemeId={profile.equippedThemeId}
                      onGameFinished={handleGameFinished}
                      isAudioMuted={isAudioMuted}
                      onMuteToggle={() => setIsAudioMuted(!isAudioMuted)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Bottom physical controls representation */}
            <div className="h-10 bg-gradient-to-b from-neutral-900 to-neutral-950 flex items-center justify-between px-6 border-t border-neutral-850">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: "0.5s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: "1s" }} />
              </div>
              <div className="font-mono text-[8px] text-neutral-600 uppercase tracking-widest uppercase">
                Arcade-Console • Player Ready
              </div>
            </div>

          </div>

          {/* Social score share trigger prompt on website */}
          {profile && view === "DASHBOARD" && (
            <div className="w-full max-w-[490px] mt-4 flex justify-between gap-3 bg-neutral-900/30 p-3 rounded-2xl border border-neutral-850/50">
              <span className="text-[10px] font-mono text-neutral-400 capitalize flex items-center gap-1.5">
                <Globe size={12} className="text-pink-500" /> Need offline help? Install app or claim daily login bonuses.
              </span>
            </div>
          )}

        </section>

        {/* ================= RIGHT SECTION: RESPONSIVE WEBSITE PANEL ================= */}
        <section className="lg:col-span-5 xl:col-span-5 space-y-6 flex flex-col justify-start">
          
          {profile ? (
            <div className="space-y-6">
              
              {/* Daily 7-Day rewards */}
              <RewardsCalendarWidget 
                profile={profile} 
                onUpdateProfile={handleUpdateProfile} 
              />

              {/* Weekly/Monthly active missions */}
              <MissionCenterWidget />

              {/* Speedway championships leaderboard table */}
              <StandingsWidget currentUserProfile={profile} />

              {/* Achievements Showcase list */}
              <AchievementsShowcaseWidget profile={profile} />

              {/* Social scores timeline & inviting widget */}
              <SocialArenaWidget profile={profile} />

              {/* PWA Local device Installer console toggle */}
              <PwaSyncWidget />

              {/* Sponsor video monetization widget */}
              <AdRewardWidget onCreditCoins={handleCreditAdCoins} />

            </div>
          ) : (
            <div className="space-y-6">
              
              {/* If not logged in: Giant visual layout prompting player login */}
              <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-6 rounded-3xl text-center space-y-4">
                <div className="bg-pink-500/10 w-12 h-12 rounded-3xl flex items-center justify-center text-2xl border border-pink-400/20 mx-auto">
                  👑
                </div>
                <div>
                  <h3 className="text-sm font-black font-mono tracking-widest text-pink-500 uppercase leading-none">
                    JOIN THE LEADERBOARDS
                  </h3>
                  <p className="font-mono text-[9px] text-neutral-500 uppercase mt-2 leading-relaxed">
                    Set up an account or register anonymously below to unlock exclusive bikes, track daily quests and compete with other pilots across the globe!
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    retroAudio.playPoint();
                    setView("AUTH");
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 rounded-xl text-white font-extrabold tracking-widest text-[11px] transition shadow-[0_4px_12px_rgba(219,39,119,0.25)] uppercase cursor-pointer"
                >
                  Configure Profile & Ride Now
                </button>
              </div>

              {/* Leaderboard widget preview (locked preview style) */}
              <div className="relative overflow-hidden rounded-3xl opacity-50 select-none">
                <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px] z-10 flex items-center justify-center flex-col p-4 text-center">
                  <Lock size={20} className="text-neutral-500" />
                  <span className="font-mono text-[9px] font-black uppercase text-neutral-400 mt-2 tracking-wider">Configure account to view live stats</span>
                </div>
                <div className="pointer-events-none">
                  {/* Dummy placeholder for beautiful structural layouts */}
                  <div className="bg-neutral-900 p-4 border border-neutral-800 rounded-3xl">
                    <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest mb-3">Live Championships</h3>
                    <div className="space-y-2">
                      <div className="h-8 bg-neutral-950 rounded-lg border border-neutral-850" />
                      <div className="h-8 bg-neutral-950 rounded-lg border border-neutral-850" />
                      <div className="h-8 bg-neutral-950 rounded-lg border border-neutral-850" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements widget preview (locked style) */}
              <div className="relative overflow-hidden rounded-3xl opacity-50 select-none">
                <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px] z-10 flex items-center justify-center flex-col p-4 text-center">
                  <Lock size={20} className="text-neutral-500" />
                  <span className="font-mono text-[9px] font-black uppercase text-neutral-400 mt-2 tracking-wider">Unlocks upon profile registration</span>
                </div>
                <div className="pointer-events-none">
                  <div className="bg-neutral-900 p-4 border border-neutral-800 rounded-3xl">
                    <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest mb-3">Racer Badges Room</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-16 bg-neutral-950 rounded-xl" />
                      <div className="h-16 bg-neutral-950 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 📡 8. ADSENSE BANNER PLACEHOLDER (Monetization Requirement) */}
          <section className="bg-neutral-900/50 backdrop-blur border border-neutral-800/60 rounded-3xl p-4 flex flex-col justify-between items-center text-center">
            <span className="font-mono text-[8px] text-neutral-600 uppercase tracking-widest mb-2">
              Sponsored Advertisement • Google AdSense Compliant
            </span>
            <div className="w-full h-20 bg-neutral-950 rounded-2xl border border-neutral-850 flex flex-col items-center justify-center p-2">
              <span className="text-[10px] leading-tight font-sans text-neutral-500 uppercase tracking-wider font-semibold">
                Extreme Turbo Chargers Discount
              </span>
              <span className="font-mono text-[8px] text-pink-500/50 mt-1 uppercase">
                www.cyberdrive-speedways-promotions.com
              </span>
            </div>
          </section>

        </section>

      </main>

      {/* 🏆 4. LEVEL UP POPUP MESSAGE BANNER */}
      <AnimatePresence>
        {levelUpMessage && (
          <motion.div
            initial={{ y: -65, opacity: 0 }}
            animate={{ y: 24, opacity: 1 }}
            exit={{ y: -65, opacity: 0 }}
            className="fixed top-3 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500 to-amber-600 border border-yellow-300 text-neutral-950 px-6 py-3.5 rounded-2xl shadow-[0_12px_30px_rgba(245,158,11,0.5)] flex items-center gap-3 font-mono text-[10px] font-black"
          >
            <Sparkles className="w-5 h-5 animate-bounce text-neutral-950 shrink-0" />
            <span>{levelUpMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🛍️ 5. GARAGE SKIN & NITRO EXHAUST STORE SHOP */}
      <AnimatePresence>
        {isStoreOpen && profile && (
          <StoreModal
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onClose={() => setIsStoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ⚙️ 6. DEV PUBLISHING SETTINGS BLUEPRINT MODAL */}
      <AnimatePresence>
        {isPublishingOpen && (
          <ArcadeSettingsPanel
            onClose={() => setIsPublishingOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 🚀 7. FOOTER BAR COMPLIANCE LABELS */}
      <footer className="mt-12 bg-neutral-950 border-t border-neutral-900 py-6 text-center text-[10px] font-mono text-neutral-600 uppercase tracking-widest space-y-1.5 z-10 shrink-0">
        <p className="flex items-center justify-center gap-1.5">
          <span>Speedway Labs Inc © 2026</span>
          <span>•</span>
          <span>Google Play Publisher Blueprint Edition</span>
        </p>
        <p className="text-[8px] text-neutral-700">
          Mobile-Responsive Layout • Hardware Acceleration Supported • offline mode enabled via caching Service Worker
        </p>
      </footer>

    </div>
  );
}
