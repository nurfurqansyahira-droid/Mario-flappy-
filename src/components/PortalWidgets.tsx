import React, { useState, useEffect } from "react";
import { UserProfile, LeaderboardEntry, DailyQuestItem, AchievementItem } from "../types";
import { DAILY_LOGIN_REWARDS_LIST, ACHIEVEMENTS_RECORDS } from "../data";
import { retroAudio } from "../audio";
import { 
  Trophy, Calendar, Share2, Users, Download, Bell, BellOff, CheckCircle, 
  Tv, Lock, Shield, Award, Sparkles, AlertCircle, RefreshCw, Send, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- 📅 1. 7-DAY REPLAY PERKS (Rewards Calendar Widget) ---
export function RewardsCalendarWidget({
  profile,
  onUpdateProfile
}: {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}) {
  const claimReward = (dayIndex: number) => {
    const currentClaimed = profile.dailyRewardsClaimedBits;
    
    if (dayIndex !== currentClaimed) {
      if (dayIndex < currentClaimed) {
        alert("You have already claimed this day's speedway bounty!");
      } else {
        alert("Check back tomorrow to claim higher-tier rewards!");
      }
      return;
    }

    const reward = DAILY_LOGIN_REWARDS_LIST[dayIndex];
    const updated = { ...profile };

    if (reward.type === "coins") {
      updated.totalCoins += reward.value;
    } else if (reward.type === "skin") {
      if (!updated.unlockedCharacters.includes(reward.itemRefId)) {
        updated.unlockedCharacters.push(reward.itemRefId);
      }
    } else if (reward.type === "effect") {
      if (!updated.unlockedTrails.includes(reward.itemRefId)) {
        updated.unlockedTrails.push(reward.itemRefId);
      }
    }

    updated.dailyRewardsClaimedBits = currentClaimed + 1;
    if (updated.dailyRewardsClaimedBits > 7) {
      updated.dailyRewardsClaimedBits = 0;
    }

    updated.lastDailyClaimDate = new Date().toISOString().split("T")[0];
    onUpdateProfile(updated);
    retroAudio.playPoint();
  };

  return (
    <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-4 rounded-3xl shadow-xl">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold font-mono text-pink-500 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-4 h-4 text-pink-500 shrink-0" />
          7-Day Booster Calendar
        </h3>
        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded-full uppercase">
          Day {profile.dailyRewardsClaimedBits}/7
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {DAILY_LOGIN_REWARDS_LIST.map((reward, idx) => {
          const isClaimed = idx < profile.dailyRewardsClaimedBits;
          const isAvailable = idx === profile.dailyRewardsClaimedBits;
          const isLocked = idx > profile.dailyRewardsClaimedBits;

          return (
            <button
              key={reward.day}
              onClick={() => claimReward(idx)}
              className={`p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all h-16 ${
                isClaimed 
                  ? "bg-green-500/10 border-green-500/30 text-green-400" 
                  : isAvailable 
                    ? "bg-pink-600 hover:bg-pink-500 border-pink-400 text-white cursor-pointer hover:scale-105 shadow-[0_0_15px_rgba(236,72,153,0.3)]" 
                    : "bg-neutral-950 border-neutral-850 text-neutral-500 cursor-not-allowed"
              }`}
            >
              <span className="font-mono text-[8px] uppercase tracking-wider">D{reward.day}</span>
              <div className="text-[11px] font-bold leading-none py-1">
                {isClaimed ? "✅" : reward.bannerImage.split(" ")[0]}
              </div>
              <span className="text-[7.5px] font-semibold truncate leading-none">
                {isClaimed ? "Claimed" : isAvailable ? "CLAIM" : "Locked"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- 🏆 2. SPEEDWAY STANDINGS (Tabs: Global, Weekly, Monthly, Friends) ---
type StandingsTab = "GLOBAL" | "WEEKLY" | "MONTHLY" | "FRIENDS";

export function StandingsWidget({ currentUserProfile }: { currentUserProfile: UserProfile }) {
  const [activeTab, setActiveTab] = useState<StandingsTab>("GLOBAL");

  // Custom data arrays populated with custom user record & country flags
  const fetchMockEntries = (tab: StandingsTab): (LeaderboardEntry & { flag: string })[] => {
    const list: (LeaderboardEntry & { flag: string })[] = [
      { uid: "ldr_1", username: "DriftQueen_88", avatarId: "avatar_2", highScore: 154, level: 32, totalCoins: 12050, flag: "🇯🇵" },
      { uid: "ldr_2", username: "HyperTurbo_Cyber", avatarId: "avatar_5", highScore: 112, level: 24, totalCoins: 8400, flag: "🇺🇸" },
      { uid: "ldr_3", username: "VaporSlick_X", avatarId: "avatar_1", highScore: 89, level: 18, totalCoins: 6150, flag: "🇩🇪" },
      { uid: "ldr_4", username: "NitroSiren", avatarId: "avatar_3", highScore: 62, level: 14, totalCoins: 4120, flag: "🇸🇬" },
      { uid: "ldr_5", username: "SpeedyViper", avatarId: "avatar_4", highScore: 41, level: 9, totalCoins: 2800, flag: "🇲🇾" },
      { uid: "ldr_6", username: "GridGlide", avatarId: "avatar_2", highScore: 24, level: 5, totalCoins: 1500, flag: "🇦🇺" }
    ];

    // Modify lists based on tabs to provide dynamic fidelity
    if (tab === "WEEKLY") {
      list[0].highScore = 78;
      list[1].highScore = 65;
      list[2].highScore = 54;
      list[3].highScore = 32;
    } else if (tab === "MONTHLY") {
      list[0].highScore = 120;
      list[1].highScore = 110;
      list[2].highScore = 95;
    } else if (tab === "FRIENDS") {
      // Small group with current user
      return [
        { uid: "ldr_3", username: "VaporSlick_X", avatarId: "avatar_1", highScore: 89, level: 18, totalCoins: 6150, flag: "🇩🇪" },
        { uid: currentUserProfile.uid, username: currentUserProfile.username, avatarId: currentUserProfile.avatarId, highScore: currentUserProfile.highScore, level: currentUserProfile.level, totalCoins: currentUserProfile.totalCoins, flag: "🇦🇺", isCurrentUser: true },
        { uid: "ldr_5", username: "SpeedyViper", avatarId: "avatar_4", highScore: 41, level: 9, totalCoins: 2800, flag: "🇲🇾" }
      ].sort((a,b) => b.highScore - a.highScore);
    }

    // Insert current user in standard boards
    const currentUserIndex = list.findIndex(e => e.uid === currentUserProfile.uid);
    if (currentUserIndex === -1) {
      list.push({
        uid: currentUserProfile.uid,
        username: currentUserProfile.username,
        avatarId: currentUserProfile.avatarId,
        highScore: currentUserProfile.highScore,
        level: currentUserProfile.level,
        totalCoins: currentUserProfile.totalCoins,
        flag: "🇦🇺",
        isCurrentUser: true
      });
    } else {
      list[currentUserIndex].highScore = currentUserProfile.highScore;
      list[currentUserIndex].level = currentUserProfile.level;
    }

    return list.sort((a, b) => b.highScore - a.highScore);
  };

  const getAvatarEmoji = (id: string) => {
    switch (id) {
      case "avatar_2": return "👩‍🎤";
      case "avatar_3": return "👩‍🚀";
      case "avatar_4": return "👸";
      case "avatar_5": return "🦊";
      default: return "🏍️";
    }
  };

  const entries = fetchMockEntries(activeTab);

  return (
    <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-4 rounded-3xl shadow-xl flex flex-col h-[320px]">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Trophy className="w-4.5 h-4.5 text-cyan-400" />
        <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest">
          Championship Standings
        </h3>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex bg-neutral-950 p-1 rounded-xl mb-3 shrink-0 gap-1">
        {(["GLOBAL", "WEEKLY", "MONTHLY", "FRIENDS"] as StandingsTab[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 text-[8.5px] py-1 font-mono rounded-lg transition-all text-center uppercase tracking-wider ${
              activeTab === t 
                ? "bg-cyan-500 text-neutral-950 font-black" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Standings entries scroll flow */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-sans select-none custom-scrollbar-thin">
        {entries.map((entry, idx) => (
          <div
            key={entry.uid}
            className={`flex justify-between items-center py-1.5 px-3 rounded-xl border text-xs transition-all ${
              entry.isCurrentUser 
                ? "bg-cyan-500/10 border-cyan-500/40 text-white" 
                : "bg-neutral-950/40 border-neutral-850 hover:bg-neutral-900/40"
            }`}
          >
            <div className="flex gap-2 items-center min-w-0">
              <span className={`font-mono text-[9.5px] font-bold w-4 ${idx < 3 ? "text-yellow-400" : "text-neutral-500"}`}>
                #{idx + 1}
              </span>
              <span className="text-[11px] leading-none shrink-0" title="Country Flag">{entry.flag}</span>
              <div className="w-5 h-5 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] shrink-0">
                {getAvatarEmoji(entry.avatarId)}
              </div>
              <span className="font-semibold truncate max-w-[100px] text-[11px]">
                {entry.username}
              </span>
            </div>

            <div className="flex items-center gap-3.5 font-mono text-[9px] shrink-0">
              <span className="text-neutral-500">Lvl {entry.level}</span>
              <span className="font-extrabold text-cyan-400">{entry.highScore} <span className="text-[7.5px] text-neutral-600 font-sans tracking-tight">GATES</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 📋 3. MISSSIONS CENTER (Tabs: Daily, Weekly, Monthly) ---
type MissionTab = "DAILY" | "WEEKLY" | "MONTHLY";

export function MissionCenterWidget() {
  const [activeTab, setActiveTab] = useState<MissionTab>("DAILY");

  const mockMissions: Record<MissionTab, DailyQuestItem[]> = {
    DAILY: [
      { id: "d1", description: "Unlock 3 speedway racing runs", rewardCoins: 80, rewardXp: 150, progress: 1, target: 3, completed: false },
      { id: "d2", description: "Dodge and pass 15 gates", rewardCoins: 120, rewardXp: 200, progress: 12, target: 15, completed: false },
      { id: "d3", description: "Retrieve 12 gold coins", rewardCoins: 100, rewardXp: 180, progress: 8, target: 12, completed: false }
    ],
    WEEKLY: [
      { id: "w1", description: "Earn 1,500 total gold coins", rewardCoins: 600, rewardXp: 1200, progress: 420, target: 1500, completed: false },
      { id: "w2", description: "Log high score grid of 30+ gates", rewardCoins: 800, rewardXp: 1500, progress: 0, target: 1, completed: false },
      { id: "w3", description: "Perform 15 active start-ups", rewardCoins: 500, rewardXp: 1000, progress: 7, target: 15, completed: false }
    ],
    MONTHLY: [
      { id: "m1", description: "Reach Pilot Profile Level 5+", rewardCoins: 2000, rewardXp: 4000, progress: 2, target: 5, completed: false },
      { id: "m2", description: "Procure J-Drifter Viper in Garage", rewardCoins: 1500, rewardXp: 3000, progress: 0, target: 1, completed: false },
      { id: "m3", description: "Reach 50 obstacles passed total", rewardCoins: 2500, rewardXp: 5000, progress: 18, target: 50, completed: false }
    ]
  };

  const currentList = mockMissions[activeTab];

  return (
    <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-4 rounded-3xl shadow-xl flex flex-col h-[300px]">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h3 className="text-xs font-bold font-mono text-medium text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
          <Award className="w-4 h-4 text-purple-400" />
          Active Speedway Missions
        </h3>
      </div>

      {/* Navigation options */}
      <div className="flex bg-neutral-950 p-1 rounded-xl mb-3 shrink-0 gap-1">
        {(["DAILY", "WEEKLY", "MONTHLY"] as MissionTab[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 text-[8.5px] py-1 font-mono rounded-lg transition-all text-center uppercase tracking-wider ${
              activeTab === t 
                ? "bg-purple-600 text-white font-black shadow" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar-thin">
        {currentList.map(m => {
          const progressPct = Math.min(100, Math.floor((m.progress / m.target) * 100));
          return (
            <div key={m.id} className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-xl flex items-center justify-between gap-3 text-left">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider leading-relaxed block truncate">
                  {m.description}
                </span>
                <div className="w-full bg-neutral-900 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <div className="shrink-0 text-right font-mono text-[8.5px] flex flex-col items-end">
                <span className="text-yellow-400 font-extrabold text-[8px]">🪙 +{m.rewardCoins}</span>
                <span className="text-purple-400 text-[8px] font-bold">🧪 +{m.rewardXp} XP</span>
                <span className="text-neutral-500 mt-1">{m.progress}/{m.target}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 🏵️ 4. SPEEDWAY BADGES (Achievements Showcase Widget) ---
export function AchievementsShowcaseWidget({ profile }: { profile: UserProfile }) {
  return (
    <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-4 rounded-3xl shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4.5 h-4.5 text-yellow-400 animate-spin" style={{ animationDuration: "5s" }} />
        <h3 className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-widest">
          Rider Badges Showcase
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ACHIEVEMENTS_RECORDS.map(ach => {
          const isUnlocked = profile.achievementsClaimed.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                isUnlocked 
                  ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-400" 
                  : "bg-neutral-950/60 border-neutral-850 text-neutral-600"
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-xl ${isUnlocked ? "" : "grayscale mix-blend-luminosity"}`}>
                  {ach.icon}
                </span>
                {isUnlocked ? (
                  <span className="bg-yellow-500 text-neutral-950 font-bold px-1.5 py-0.5 rounded text-[7.5px] uppercase">
                    ACTIVE
                  </span>
                ) : (
                  <span className="bg-neutral-900 text-neutral-500 font-bold px-1.5 py-0.5 rounded text-[7.5px] uppercase">
                    LOCKED
                  </span>
                )}
              </div>
              <div className="mt-2 text-left">
                <h4 className={`text-[10px] font-bold ${isUnlocked ? "text-white" : "text-neutral-500"}`}>{ach.title}</h4>
                <p className="text-[8px] font-mono leading-tight mt-0.5 max-w-full text-neutral-500">{ach.description}</p>
              </div>
              <div className="flex justify-between items-center mt-2 pt-1 border-t border-neutral-800/50 font-mono text-[7px] uppercase">
                <span>XP: +{ach.rewardXp}</span>
                <span>🪙 +{ach.rewardCoins}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 🌐 5. SPEEDWAY COMMUNITY TIMELINE & INVIATION ARENA ---
interface TimelineEntry {
  id: string;
  user: string;
  avatar: string;
  score: number;
  time: string;
  likes: number;
  hasLiked?: boolean;
}

export function SocialArenaWidget({ profile }: { profile: UserProfile }) {
  const [inviteName, setInviteName] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  
  // Simulated timelines
  const [feed, setFeed] = useState<TimelineEntry[]>([
    { id: "f1", user: "DriftQueen_88", avatar: "👩‍🎤", score: 142, time: "2 min ago", likes: 14 },
    { id: "f2", user: "HyperTurbo_Cyber", avatar: "🦊", score: 98, time: "1 hour ago", likes: 8 },
    { id: "f3", user: "NitroSiren", avatar: "👸", score: 54, time: "4 hours ago", likes: 5 }
  ]);

  const handleShareScore = () => {
    if (profile.highScore === 0) {
      alert("Clock some speedway distance first! Post to feed option is unlocked after racing.");
      return;
    }
    
    // Check if score is already shared in list
    const exists = feed.some(f => f.user === profile.username);
    if (exists) {
      alert("Your ultimate score drift details are already posted and live on the speedway channel!");
      return;
    }

    const newPost: TimelineEntry = {
      id: `f_${Date.now()}`,
      user: profile.username,
      avatar: "🏍️",
      score: profile.highScore,
      time: "Just now",
      likes: 0
    };

    setFeed([newPost, ...feed]);
    retroAudio.playPoint();
    alert("🚀 High score logged successfully! Drift report posted to the Speedway Social feed!");
  };

  const sendInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) return;

    setInviteSuccess(`Invitation dispatched to racer index "${inviteName}" successfully!`);
    retroAudio.playCoin();
    setInviteName("");
    setTimeout(() => setInviteSuccess(null), 3000);
  };

  const handleLike = (id: string) => {
    setFeed(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          likes: p.hasLiked ? p.likes - 1 : p.likes + 1,
          hasLiked: !p.hasLiked
        };
      }
      return p;
    }));
    retroAudio.playPoint();
  };

  return (
    <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-4 rounded-3xl shadow-xl space-y-4">
      {/* Invite Friends Block */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold font-mono text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
          <Users className="w-4 h-4 text-purple-400" />
          Racer Recruitment Hub
        </h3>
        <p className="text-[9px] font-mono text-neutral-500 uppercase leading-snug">
          Recruit drift pilots to your speedway and secure a 🪙 +200 Gold Bonus.
        </p>

        {inviteSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[9px] py-1.5 px-3 rounded-xl flex items-center gap-1">
            <Check className="w-3 h-3 shrink-0" />
            <span>{inviteSuccess}</span>
          </div>
        )}

        <form onSubmit={sendInvitation} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter racer codename..."
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 border border-purple-400 px-3 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 text-white"
          >
            <Send className="w-3.5 h-3.5 fill-white stroke-[2.2]" />
          </button>
        </form>
      </div>

      <hr className="border-neutral-800" />

      {/* Social Feed Display */}
      <div className="space-y-2.5 text-left">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-mono text-neutral-400 uppercase font-black">
            📡 Live Speedway Feed
          </h4>
          <button
            onClick={handleShareScore}
            className="text-[8.5px] font-mono text-pink-500 hover:text-white uppercase font-bold tracking-wider hover:underline"
          >
            Share My Score
          </button>
        </div>

        <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar-thin">
          {feed.map(post => (
            <div key={post.id} className="p-2 bg-neutral-950 border border-neutral-850 rounded-xl flex items-start gap-2.5">
              <span className="text-lg leading-none shrink-0">{post.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center font-mono text-[8px] uppercase">
                  <span className="font-bold text-white truncate max-w-[80px]">{post.user}</span>
                  <span className="text-neutral-500">{post.time}</span>
                </div>
                <p className="text-[10px] font-sans text-neutral-300 mt-1 leading-normal">
                  Drove standard turbo and set high drift of <strong className="text-cyan-400 font-mono">{post.score} GATES</strong>! Can you beat it?
                </p>
                <div className="mt-1.5 flex justify-end">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`font-mono text-[8px] flex items-center gap-1 uppercase font-bold py-0.5 px-1.5 rounded bg-neutral-900 border border-neutral-850 ${
                      post.hasLiked ? "text-pink-500 border-pink-500/20" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    ❤️ {post.likes}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- 🌐 6. PWA COMPLIANCE AND SYNCS CONTROL ---
export function PwaSyncWidget() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPushReady, setIsPushReady] = useState(false);

  const simulateAppInstall = () => {
    if (isInstalled) {
      alert("Motor Speedway is already configured and running locally on this desktop device!");
      return;
    }
    retroAudio.playPoint();
    alert("📥 Initiating Speedway PWA Desktop Native Installer package... Shortcut configured successfully on your home screen!");
    setIsInstalled(true);
  };

  const simulatePushToggle = () => {
    setIsPushReady(!isPushReady);
    retroAudio.playPoint();
    alert(isPushReady ? "Notifications muted successfully." : "🔔 Push Notifications enabled! Receive alerts on daily rewards counters and championship streaks.");
  };

  return (
    <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-4 rounded-3xl shadow-xl space-y-3 text-left">
      <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
        <Download className="w-4 h-4 text-cyan-400 text-medium" />
        PWA Application Console
      </h3>

      <div className="grid grid-cols-2 gap-2 text-[9.5px]">
        {/* Install Option */}
        <button
          onClick={simulateAppInstall}
          className={`p-2.5 border rounded-xl flex flex-col justify-between transition-all text-left h-16 ${
            isInstalled 
              ? "bg-green-500/5 border-green-500/20 text-green-400" 
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 cursor-pointer"
          }`}
        >
          <div className="flex justify-between items-center w-full">
            <Download size={11} />
            <span className="font-mono text-[7px] bg-neutral-950 px-1 py-0.5 rounded leading-none">SYSTEM</span>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider block">
              {isInstalled ? "App Installed" : "Install App"}
            </span>
            <span className="text-[7.5px] font-mono text-neutral-500">Android/iOS/PC fallback</span>
          </div>
        </button>

        {/* Sync Status / Offline indicator */}
        <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-xl flex flex-col justify-between h-16">
          <div className="flex justify-between items-center">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="font-mono text-[7px] text-green-400 uppercase">ONLINE</span>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider text-white text-[9.5px]">Offline Ready</span>
            <span className="text-[7.5px] font-mono text-neutral-500">Service Worker Active</span>
          </div>
        </div>
      </div>

      {/* Push Switcher */}
      <div className="bg-neutral-950 p-2.5 border border-neutral-850 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPushReady ? <Bell className="w-4 h-4 text-pink-500" /> : <BellOff className="w-4 h-4 text-neutral-500" />}
          <div>
            <div className="text-[9.5px] font-bold text-white uppercase tracking-wider leading-none">Push Alerts</div>
            <span className="text-[8px] font-mono text-neutral-500 uppercase block mt-1">Streaks & Level updates</span>
          </div>
        </div>

        <button
          onClick={simulatePushToggle}
          className={`py-1 px-2.5 rounded-lg border text-[8px] font-mono font-black uppercase transition-all ${
            isPushReady 
              ? "bg-pink-600/20 border-pink-500 text-pink-500 font-extrabold" 
              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          {isPushReady ? "ACTIVE" : "ENABLE"}
        </button>
      </div>
    </div>
  );
}

// --- 📺 7. MONETIZATION (Rewarded Video Ads simulation) ---
export function AdRewardWidget({
  onCreditCoins
}: {
  onCreditCoins: (amount: number) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const startAd = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setCountdown(5);
    retroAudio.playPoint();
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (countdown === 0) {
      setIsPlaying(false);
      onCreditCoins(100);
      retroAudio.playCoin();
      alert("🎉 Rewarded ad completed! credited +100 virtual G-Coins!");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isPlaying, countdown]);

  return (
    <div className="bg-gradient-to-br from-indigo-950/40 to-neutral-900 border border-neutral-800 p-4 rounded-3xl shadow-xl space-y-3 flex flex-col justify-between text-left h-36">
      <div>
        <h3 className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
          <Tv className="w-4 h-4 text-indigo-400 shrink-0" />
          Sponsor Speedway Ads
        </h3>
        <p className="text-[9px] font-mono text-neutral-500 uppercase leading-snug tracking-wider mt-1.5">
          Support developers & claim 🪙 +100 gold bonus instantly by streaming promotional logs.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {isPlaying ? (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-neutral-950 border border-pink-500/30 p-2.5 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-[9px] text-neutral-400 uppercase">Streaming sponsor clip...</span>
            </div>
            <span className="text-pink-500 font-mono text-xs font-black">{countdown}s</span>
          </motion.div>
        ) : (
          <button
            onClick={startAd}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-mono text-[9.5px] font-extrabold tracking-widest uppercase rounded-xl transition cursor-pointer shadow-md shadow-indigo-900/40"
          >
            Stream Rewarded Ad (🪙 +100)
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
