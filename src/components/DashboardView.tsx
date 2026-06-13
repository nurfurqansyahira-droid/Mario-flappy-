import { useState, useEffect } from "react";
import { UserProfile, LeaderboardEntry, DailyQuestItem } from "../types";
import { DAILY_LOGIN_REWARDS_LIST, ACHIEVEMENTS_RECORDS } from "../data";
import { getGlobalLeaderboard, loadDailyQuests } from "../lib/progressDb";
import { retroAudio } from "../audio";
import { 
  Gamepad2, Coins, Trophy, Calendar, Award, User, RefreshCw, 
  ChevronRight, Sparkles, BookOpen, Clock, Play, ListCollapse, Volume2, VolumeX, ShieldAlert
} from "lucide-react";
import { motion } from "motion/react";

interface DashboardViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onLaunchGame: () => void;
  onOpenStore: () => void;
  onOpenPublishingPanel: () => void;
  isAudioMuted: boolean;
  onMuteToggle: () => void;
  onSignOut: () => void;
}

export default function DashboardView({
  profile,
  onUpdateProfile,
  onLaunchGame,
  onOpenStore,
  onOpenPublishingPanel,
  isAudioMuted,
  onMuteToggle,
  onSignOut
}: DashboardViewProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dailyQuests, setDailyQuests] = useState<DailyQuestItem[]>([]);
  const [showQuests, setShowQuests] = useState(true);

  // Load leaderboard and quests on mount
  useEffect(() => {
    async function loadData() {
      const bds = await getGlobalLeaderboard(profile);
      setLeaderboard(bds);
      setDailyQuests(loadDailyQuests());
    }
    loadData();
  }, [profile]);

  // Handle claiming the next Daily Login Reward
  const claimDailyLoginReward = (dayIndex: number) => {
    // Current claimed count is equal to profile.dailyRewardsClaimedBits
    const currentClaimed = profile.dailyRewardsClaimedBits;
    
    // Check if clicking the immediate next available claim
    if (dayIndex !== currentClaimed) {
      if (dayIndex < currentClaimed) {
        alert("You have already claimed this day's speedway bounty!");
      } else {
        alert("Check back tomorrow to claim higher tier speedway rewards!");
      }
      return;
    }

    const reward = DAILY_LOGIN_REWARDS_LIST[dayIndex];
    const updated = { ...profile };

    // Credit reward based on model type
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

    // Progress counter
    updated.dailyRewardsClaimedBits = currentClaimed + 1;
    // reset to zero if filled 7 days
    if (updated.dailyRewardsClaimedBits > 7) {
      updated.dailyRewardsClaimedBits = 0;
    }

    updated.lastDailyClaimDate = new Date().toISOString().split("T")[0];
    onUpdateProfile(updated);
    retroAudio.playPoint();
    alert(`🎉 Day ${reward.day} Claimed! Received: ${reward.label}`);
  };

  const getAvatarEmoji = (id: string) => {
    switch (id) {
      case "avatar_1": return "🏍️";
      case "avatar_2": return "👩‍🎤";
      case "avatar_3": return "👩‍🚀";
      case "avatar_4": return "👸";
      case "avatar_5": return "🦊";
      default: return "⚡";
    }
  };

  const xpPercent = Math.min(100, Math.floor((profile.xp / profile.xpNeeded) * 100));

  return (
    <div className="w-full max-w-[500px] h-[640px] bg-neutral-950 font-sans flex flex-col justify-between items-center relative overflow-hidden rounded-3xl border border-neutral-805 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-white">
      
      {/* Visual Header panel showing currency details */}
      <header className="w-full px-4 pt-4 pb-3 flex justify-between items-center bg-neutral-900 border-b border-neutral-800/80 z-10 shrink-0">
        <div className="flex gap-2.5 items-center">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-xl shadow-inner">
              {getAvatarEmoji(profile.avatarId)}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-pink-500 text-white font-mono text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-black leading-none">
              {profile.level}
            </span>
          </div>

          <div className="text-left">
            <h3 className="text-xs font-black tracking-wide truncate max-w-[120px] text-white leading-tight">
              {profile.username}
            </h3>
            <div className="w-24 bg-neutral-950 h-1.5 rounded-full mt-1 overflow-hidden p-[1px] border border-neutral-850">
              <div className="h-full bg-pink-500 rounded-full" style={{ width: `${xpPercent}%` }}></div>
            </div>
            <div className="text-[7.5px] font-mono text-neutral-500 uppercase mt-0.5 tracking-wider">
              XP: {profile.xp}/{profile.xpNeeded}
            </div>
          </div>
        </div>

        {/* Currency Display & mute control */}
        <div className="flex items-center gap-2.5">
          <div onClick={onOpenStore} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-950 rounded-xl border border-neutral-805 cursor-pointer hover:border-pink-500/30 transition">
            <Coins className="w-3.5 h-3.5 text-yellow-400 shrink-0 animate-pulse" />
            <span className="font-mono text-[10.5px] font-extrabold text-yellow-400">{profile.totalCoins}</span>
          </div>

          <button 
            id="mute-dashboard"
            onClick={onMuteToggle}
            className="p-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-805 rounded-xl text-neutral-400 hover:text-white cursor-pointer transition"
          >
            {isAudioMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
        </div>
      </header>

      {/* Primary body view - Scrollable hub slots */}
      <main className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-4 min-h-0 relative z-10 custom-scrollbar-thin">
        
        {/* Play & garage primary hero launcher grids */}
        <div className="grid grid-cols-2 gap-3">
          <button
            id="start-match"
            onClick={onLaunchGame}
            className="h-28 bg-gradient-to-br from-pink-600 via-pink-700 to-indigo-700 rounded-3xl border border-pink-400/20 flex flex-col justify-between p-4 shadow-lg text-left relative overflow-hidden group cursor-pointer"
          >
            {/* abstract speed grid lines back */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
            
            <div className="bg-white/10 w-8 h-8 rounded-xl flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-black tracking-widest text-[12px] uppercase leading-none">START RACE</h4>
              <span className="font-mono text-[8px] text-pink-200 uppercase mt-1 block">Horizon freeway speedway</span>
            </div>
          </button>

          <button
            id="open-garage-grid"
            onClick={onOpenStore}
            className="h-28 bg-neutral-900 rounded-3xl border border-neutral-805 flex flex-col justify-between p-4 text-left hover:border-pink-500/40 transition-all relative overflow-hidden group cursor-pointer"
          >
            <div className="bg-yellow-500/10 w-8 h-8 rounded-xl border border-yellow-500/20 flex items-center justify-center">
              <Award className="w-4 h-4 text-yellow-400 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-black tracking-widest text-[12px] uppercase leading-none text-white">MY GARAGE</h4>
              <span className="font-mono text-[8px] text-neutral-500 uppercase mt-1 block">Customize skin & exhaust trails</span>
            </div>
          </button>
        </div>

        {/* 📅 Tab Slot A: 7-Day Rewards Calendar (Grid check board) */}
        <section className="bg-gradient-to-b from-neutral-900 to-neutral-910 p-3 rounded-3xl border border-neutral-808/85">
          <div className="flex justify-between items-center mb-2.5">
            <h4 className="text-[10px] font-mono tracking-widest text-pink-500 uppercase font-black flex items-center gap-1.5">
              <Calendar size={12} />
              7-Day Daily Login Perks
            </h4>
            <span className="text-[8px] font-mono text-neutral-500 uppercase">
              Streak: Day {profile.dailyRewardsClaimedBits}/7
            </span>
          </div>

          {/* Checklist grid */}
          <div className="grid grid-cols-4 gap-2">
            {DAILY_LOGIN_REWARDS_LIST.map((reward, idx) => {
              const isClaimed = idx < profile.dailyRewardsClaimedBits;
              const isAvailable = idx === profile.dailyRewardsClaimedBits;
              const isLocked = idx > profile.dailyRewardsClaimedBits;

              return (
                <button
                  id={`claim-day-${reward.day}`}
                  key={reward.day}
                  onClick={() => claimDailyLoginReward(idx)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between transition h-14 ${isClaimed ? "bg-green-500/5 border-green-500/20 text-green-400" : isAvailable ? "bg-pink-600 border-pink-400 hover:scale-103 cursor-pointer text-white shadow-[0_0_12px_rgba(219,39,119,0.3)] animate-pulse" : "bg-neutral-950 border-neutral-850 text-neutral-500"}`}
                >
                  <span className="font-mono text-[8.5px] uppercase font-semibold">Day {reward.day}</span>
                  <div className="text-[9.5px] font-bold tracking-tight py-0.5 truncate max-w-full">
                    {reward.bannerImage}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 📋 Tab Slot B: Daily Quests Progress List */}
        <section className="bg-neutral-900 p-3 rounded-2xl border border-neutral-805">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-black">
              📋 Active Daily Missions
            </h4>
          </div>
          <div className="space-y-2">
            {dailyQuests.map(q => {
              const progressPct = Math.floor((q.progress / q.target) * 100);
              return (
                <div key={q.id} className="p-2 bg-neutral-950 rounded-xl border border-neutral-850 flex items-center justify-between gap-3 text-left">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[9px] text-neutral-400 uppercase leading-snug tracking-wider">{q.description}</p>
                    <div className="w-full bg-neutral-900 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono text-[8px]">
                    <div className="text-yellow-400 font-bold leading-none">🪙 +{q.rewardCoins}</div>
                    <div className="text-neutral-500 mt-1">{q.progress}/{q.target}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 🏆 Tab Slot C: Global Leaderboards */}
        <section className="bg-neutral-900 p-3 rounded-3xl border border-neutral-805">
          <h4 className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-black mb-2 flex items-center gap-1.5">
            <Trophy size={12} />
            Speedway Championship Standings
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar-thin pr-1">
            {leaderboard.map((u, index) => (
              <div 
                key={u.uid} 
                className={`flex justify-between items-center h-8 px-2.5 rounded-lg border text-xs ${u.isCurrentUser ? "bg-gradient-to-r from-pink-950/40 to-neutral-900 border-pink-500/50" : "bg-neutral-950/50 border-neutral-850"}`}
              >
                <div className="flex gap-2 items-center min-w-0">
                  <span className={`font-mono text-[10px] font-bold w-4 text-center ${index < 3 ? "text-yellow-400" : "text-neutral-500"}`}>
                    #{index + 1}
                  </span>
                  <div className="w-5 h-5 rounded bg-neutral-900 flex items-center justify-center text-xs border border-neutral-800">
                    {getAvatarEmoji(u.avatarId)}
                  </div>
                  <span className="font-semibold truncate max-w-[120px] text-[11px] text-white">
                    {u.username}
                  </span>
                </div>

                <div className="flex items-center gap-4 font-mono text-[10px]">
                  <span className="text-neutral-500 text-[8.5px]">Lvl {u.level}</span>
                  <span className="font-black text-cyan-400">{u.highScore} <span className="text-[7.5px] text-neutral-600 font-sans tracking-tight">GATES</span></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 📱 Publishing Blueprints CTA launcher */}
        <button
          id="open-publishing"
          onClick={onOpenPublishingPanel}
          className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-900 border border-dashed border-pink-500/30 hover:border-pink-500 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer text-pink-500 hover:text-white"
        >
          <BookOpen size={13} />
          <span className="font-mono text-[9px] tracking-widest uppercase font-bold">
            PLAY STORE PUBLISHING BLUEPRINT
          </span>
        </button>

      </main>

      {/* Footer bar containing logout logs links */}
      <footer className="w-full h-11 px-4 border-t border-neutral-900 flex justify-between items-center bg-neutral-900 shrink-0 z-10 text-[9px] font-mono text-neutral-500">
        <span className="uppercase">High score: {profile.highScore} GATES</span>
        <button 
          onClick={onSignOut}
          className="hover:text-purple-400 transition cursor-pointer uppercase font-bold"
        >
          Sign Out Racer
        </button>
      </footer>
      
    </div>
  );
}
