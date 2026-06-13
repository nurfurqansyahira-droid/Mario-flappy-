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
import { Sparkles } from "lucide-react";

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

  // Monitor Auth Changes
  useEffect(() => {
    // If we're using offline replication mockup, fetch guest cache
    if (isMockFirebase) {
      const activeUserUid = localStorage.getItem("motorgirl_active_uid");
      if (activeUserUid) {
        loadUserProfile(activeUserUid).then(p => {
          setProfile(p);
        });
      }
      return;
    }

    // Monitor Firebase real Auth state
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

  // Update master audio node states when changed
  useEffect(() => {
    retroAudio.setMute(isAudioMuted);
  }, [isAudioMuted]);

  // Handler upon finishing the introductory splash loader animation
  const handleSplashComplete = () => {
    // Determine active route based on logged-in record
    const activeUid = isMockFirebase ? localStorage.getItem("motorgirl_active_uid") : auth.currentUser?.uid;
    if (profile || activeUid) {
      setView("DASHBOARD");
    } else {
      setView("AUTH");
    }
  };

  // Handler on login or guest creation
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
      // In real Firebase, we log in or sign up using standard popup methods
      // For the high-fidelity applet preview block, we mock sync on login success triggers
      const verifiedUid = `racer_uid_${email.replace(/[@.]/g, "_")}`;
      const cloudProfile = await loadUserProfile(verifiedUid, email);
      cloudProfile.username = username;
      cloudProfile.isAnonymous = false;
      await saveUserProfile(cloudProfile);
      setProfile(cloudProfile);
      setView("DASHBOARD");
    }
  };

  // Sign out user profile state
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

  // Sync profile edits (shop purchases, equipping items, claiming calendars)
  const handleUpdateProfile = async (updated: UserProfile) => {
    setProfile(updated);
    await saveUserProfile(updated);
  };

  // Handle post-session run results (credited gold balance + level-up check)
  const handleGameFinished = async (score: number, coinsCollected: number) => {
    if (!profile) return;

    let updated = { ...profile };

    // 1. Credit stats metrics
    updated.totalCoins += coinsCollected;
    updated.coinsCollectedTotal += coinsCollected;
    updated.obstaclesPassedTotal += score;
    updated.totalGames += 1;
    if (score > updated.highScore) {
      updated.highScore = score;
    }

    // 2. Award XP points (Gates pass = 8 XP, Gold collected = 5 XP)
    const xpReward = (score * 8) + (coinsCollected * 5);
    const { profile: xpProfile, leveledUp, unlockedItems } = processXpReward(updated, xpReward);
    updated = xpProfile;

    // 3. Evaluate missions progress
    const { quests } = updateQuestsOnGameRun(score, coinsCollected);

    // 4. Evaluate and audit unlocked achievements
    const { updatedProfile, newlyUnlocked } = auditAndUnlockAchievements(updated);
    updated = updatedProfile;

    // Save profile state back to cache/db
    setProfile(updated);
    await saveUserProfile(updated);

    // 5. Trigger animations / audio feedback overlays
    if (leveledUp) {
      retroAudio.playPoint();
      setLevelUpMessage(`LEVEL UP! You reached Rank ${updated.level}!`);
      setTimeout(() => setLevelUpMessage(null), 4000);
    } else if (newlyUnlocked.length > 0) {
      retroAudio.playPoint();
      setLevelUpMessage(`🏆 ACHIEVEMENT: "${newlyUnlocked[0]}" Unlocked!`);
      setTimeout(() => setLevelUpMessage(null), 4000);
    }

    // Return to dashboard
    setView("DASHBOARD");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-0 md:p-4 font-sans select-none overflow-hidden relative">
      
      {/* Dynamic altitude atmosphere background based on equipped theme */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(219,39,119,0.15),transparent_60%)] pointer-events-none" />

      {/* Primary visual screens rendering */}
      <AnimatePresence mode="wait">
        {view === "SPLASH" && (
          <motion.div key="splash" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <SplashView onComplete={handleSplashComplete} />
          </motion.div>
        )}

        {view === "AUTH" && (
          <motion.div 
            key="auth" 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
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
          >
            <div className="w-full max-w-[500px] h-[640px] bg-black rounded-3xl overflow-hidden border border-neutral-805 relative">
              <GameCanvas 
                equippedCharacterId={profile.equippedCharacterId}
                equippedTrailId={profile.equippedTrailId}
                equippedThemeId={profile.equippedThemeId}
                onGameFinished={handleGameFinished}
                isAudioMuted={isAudioMuted}
                onMuteToggle={() => setIsAudioMuted(!isAudioMuted)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up & Achievements popping banners */}
      <AnimatePresence>
        {levelUpMessage && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-2 z-50 bg-gradient-to-r from-yellow-500 to-amber-600 border border-yellow-300 text-neutral-950 px-5 py-3 rounded-2xl shadow-[0_10px_25px_rgba(245,158,11,0.4)] flex items-center gap-3 font-mono text-[10px] font-extrabold"
          >
            <Sparkles className="w-5 h-5 animate-bounce text-neutral-950" />
            <span>{levelUpMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shop Overlays Modal popup */}
      <AnimatePresence>
        {isStoreOpen && profile && (
          <StoreModal
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onClose={() => setIsStoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Publishing panels popup */}
      <AnimatePresence>
        {isPublishingOpen && (
          <ArcadeSettingsPanel
            onClose={() => setIsPublishingOpen(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
